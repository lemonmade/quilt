import {EventEmitter} from 'events';
import * as path from 'path';
import {mkdir, readFile, writeFile} from 'fs/promises';

import {DocumentNode, parse, printSchema, Source, GraphQLSchema} from 'graphql';
import {FSWatcher, watch} from 'chokidar';
import {globby} from 'globby';
import isGlob from 'is-glob';

import {extractImports} from '../transform';
import {loadConfiguration} from '../project';
import type {
  GraphQLConfiguration,
  GraphQLProjectConfiguration,
} from '../project';
import type {
  DocumentOutputKind,
  SchemaOutputKind,
  SchemaOutputKindInputTypes,
  QuiltExtensions,
} from '../configuration';
import {generateDocumentTypes, generateSchemaTypes} from './print';
import type {DocumentDetails, ProjectDetails} from './types';

export interface RunOptions {
  watch?: boolean;
}

interface ProjectBuildStartDetails {
  project: GraphQLProjectConfiguration;
}

interface ProjectBuildEndDetails {
  project: GraphQLProjectConfiguration;
  schema: SchemaBuildDetails;
  documents: DocumentBuildDetails[];
}

interface SchemaBuildDetails {
  project: GraphQLProjectConfiguration;
  schema: GraphQLSchema;
  outputKinds: SchemaOutputKind[];
}

interface DocumentBuildDetails {
  project: GraphQLProjectConfiguration;
  document: DocumentNode;
  documentPath: string;
  dependencies: Set<string>;
  outputKinds: DocumentOutputKind[];
}

interface DocumentBuildErrorDetails extends DocumentBuildDetails {
  error: Error;
  project: GraphQLProjectConfiguration;
  document: DocumentNode;
  documentPath: string;
  dependencies: Set<string>;
}

type ProjectDetailsMap = Map<GraphQLProjectConfiguration, ProjectDetails>;

export async function createBuilder(cwd?: string, options?: Partial<Options>) {
  const configuration = await loadConfiguration(cwd);
  return new Builder(configuration, options);
}

export interface Options {
  package: string;
}

const SCHEMA_OUTPUT_KINDS_WITH_INPUT_TYPE_EXPORTS = new Set<
  SchemaOutputKind['kind']
>(['inputTypes', 'definitions']);

export class Builder extends EventEmitter {
  readonly options: Options;

  private watching = false;
  private readonly config: GraphQLConfiguration | undefined;
  private readonly projectDetails: ProjectDetailsMap = new Map();

  private get projects() {
    return this.config ? Object.values(this.config.projects) : [];
  }

  private readonly documentOutputKindMatchCache = new WeakMap<
    DocumentOutputKind,
    Promise<string[]> | string[]
  >();

  private readonly watchers: Set<FSWatcher> = new Set();

  constructor(
    config?: GraphQLConfiguration,
    {
      package: graphqlPackage = '@quilted/graphql',
      ...options
    }: Partial<Options> = {},
  ) {
    super();
    this.config = config;
    this.options = {package: graphqlPackage, ...options};
  }

  once(event: 'error', handler: (error: Error) => void): this;
  once(
    event: 'project:build:start',
    handler: (start: ProjectBuildStartDetails) => void,
  ): this;

  once(
    event: 'project:build:end',
    handler: (end: ProjectBuildEndDetails) => void,
  ): this;

  once(
    event: 'schema:build:end',
    handler: (built: SchemaBuildDetails) => void,
  ): this;

  once(
    event: 'document:build:error',
    handler: (built: DocumentBuildErrorDetails) => void,
  ): this;

  once(
    event: 'document:build:end',
    handler: (built: DocumentBuildDetails) => void,
  ): this;

  once(event: string, handler: (...args: any[]) => void): this {
    return super.once(event, handler);
  }

  on(event: 'error', handler: (error: Error) => void): this;
  on(
    event: 'project:build:start',
    handler: (start: ProjectBuildStartDetails) => void,
  ): this;

  on(
    event: 'project:build:end',
    handler: (end: ProjectBuildEndDetails) => void,
  ): this;

  on(
    event: 'schema:build:end',
    handler: (built: SchemaBuildDetails) => void,
  ): this;

  on(
    event: 'document:build:error',
    handler: (built: DocumentBuildErrorDetails) => void,
  ): this;

  on(
    event: 'document:build:end',
    handler: (built: DocumentBuildDetails) => void,
  ): this;

  on(event: string, handler: (...args: any[]) => void): this {
    return super.on(event, handler);
  }

  emit(event: 'error', error: Error): boolean;
  emit(event: 'project:build:start', start: ProjectBuildStartDetails): boolean;
  emit(event: 'project:build:end', end: ProjectBuildEndDetails): boolean;
  emit(event: 'schema:build:end', built: SchemaBuildDetails): boolean;
  emit(event: 'document:build:end', built: DocumentBuildDetails): boolean;
  emit(
    event: 'document:build:error',
    built: DocumentBuildErrorDetails,
  ): boolean;
  emit(event: string, ...args: any[]): boolean {
    return super.emit(event, ...args);
  }

  async watch() {
    this.watching = true;

    const updateDocument = async (
      filePath: string,
      project: GraphQLProjectConfiguration,
    ) => {
      try {
        await this.updateDocumentInProject(filePath, project);
        await this.buildDocumentType(filePath, project);
      } catch (error) {
        this.emit('error', error as Error);
      }
    };

    await this.run();

    if (!this.watching) return;

    for (const project of this.projects) {
      const documents = project.documentPatterns;

      if (documents.length === 0) continue;

      const schemasWatcher = watch(project.schemaPatterns, {
        cwd: project.root,
        ignoreInitial: true,
        followSymlinks: false,
      })
        .on('add', () => this.updateProjectTypes(project))
        .on('unlink', () => this.updateProjectTypes(project))
        .on('change', () => this.updateProjectTypes(project));

      this.watchers.add(schemasWatcher);

      const documentsWatcher = watch(documents, {
        cwd: project.root,
        ignored: project.excludePatterns,
        ignoreInitial: true,
        followSymlinks: false,
      })
        .on('add', (filePath: string) => updateDocument(filePath, project))
        .on('change', (filePath: string) => updateDocument(filePath, project))
        .on('unlink', async (filePath: string) => {
          this.projectDetails.get(project)?.documents.delete(filePath);
        });

      this.watchers.add(documentsWatcher);
    }

    // wait for all watchers to be ready
    await Promise.all(
      [...this.watchers].map(
        (watcher) =>
          new Promise<void>((resolve) => watcher.on('ready', () => resolve())),
      ),
    );
  }

  async run() {
    try {
      await Promise.all(
        this.projects.map((project) => this.buildProjectTypes(project)),
      );
    } catch (error) {
      this.emit('error', error as Error);
      throw error;
    }
  }

  stop() {
    this.watching = false;

    for (const watcher of this.watchers) {
      watcher.close();
    }

    this.watchers.clear();
  }

  private async buildProjectTypes(project: GraphQLProjectConfiguration) {
    try {
      this.emit('project:build:start', {project});
      const schema = await this.buildSchemaTypes(project);
      const documents = await this.buildDocumentTypes(project);
      this.emit('project:build:end', {
        schema,
        documents,
        project,
      } as ProjectBuildEndDetails);
    } catch (error) {
      this.emit('error', error as Error);
      throw error;
    }
  }

  private async updateProjectTypes(project: GraphQLProjectConfiguration) {
    try {
      await this.buildSchemaTypes(project);
      await Promise.all(
        [...this.projectDetails.get(project)!.documents.keys()].map((file) =>
          this.buildDocumentType(file, project),
        ),
      );
    } catch (error) {
      this.emit('error', error as Error);
      throw error;
    }
  }

  private async buildSchemaTypes(
    project: GraphQLProjectConfiguration,
  ): Promise<SchemaBuildDetails> {
    // GraphQL config (through @graphql-tools) handles loading and merging
    // multiple schema files. For now, this is fine, since we don’t support
    // a schema being loaded over the network. Once we do, though, we should
    // verify that we are comfortable with when this is getting called, since
    // network requests can have a big impact on developer experience for some
    // of the larger schemas at Shopify.
    const schema = await project.getSchema();

    const projectDetails = this.projectDetails.get(project);

    if (projectDetails) {
      projectDetails.schema = schema;
    } else {
      this.projectDetails.set(project, {
        schema,
        documents: new Map(),
      });
    }

    const {schema: schemaOutputKinds = [{kind: 'inputTypes'}], customScalars} =
      getOptions(project);

    if (schemaOutputKinds.length === 0) {
      return {
        project,
        schema,
        outputKinds: schemaOutputKinds,
      };
    }

    const normalizedSchemaOutputKinds = schemaOutputKinds.map((outputKind) => ({
      ...outputKind,
      outputPath:
        outputKind.outputPath ??
        getDefaultSchemaOutputPath(project, {
          typesOnly: outputKind.kind !== 'definitions',
        }),
    }));

    let schemaInputTypes: string | undefined;
    let schemaOutputTypes: string | undefined;
    let schemaDefinitionTypes: string | undefined;

    await Promise.all(
      normalizedSchemaOutputKinds.map(async (outputKind) => {
        const {kind, outputPath} = outputKind;

        switch (kind) {
          case 'inputTypes': {
            schemaInputTypes =
              schemaInputTypes ??
              generateSchemaTypes(schema, {
                customScalars,
                kind: outputKind,
              });

            const finalOutputPath = normalizeSchemaTypesPath(
              outputPath,
              project,
              {
                isDefault: this.projects.length === 1,
              },
            );

            await mkdir(path.dirname(finalOutputPath), {recursive: true});
            await writeFile(finalOutputPath, schemaInputTypes);
            break;
          }
          case 'outputTypes': {
            schemaOutputTypes =
              schemaOutputTypes ??
              generateSchemaTypes(schema, {
                customScalars,
                kind: outputKind,
              });

            const finalOutputPath = normalizeSchemaTypesPath(
              outputPath,
              project,
              {
                isDefault: this.projects.length === 1,
              },
            );

            await mkdir(path.dirname(finalOutputPath), {recursive: true});
            await writeFile(finalOutputPath, schemaOutputTypes);
            break;
          }
          case 'definitions': {
            schemaDefinitionTypes =
              schemaDefinitionTypes ??
              generateSchemaTypes(schema, {
                customScalars,
                kind: outputKind,
              });

            const finalOutputPath = normalizeSchemaTypesPath(
              outputPath,
              project,
              {
                isDefault: this.projects.length === 1,
              },
            );

            await mkdir(path.dirname(finalOutputPath), {recursive: true});
            await writeFile(finalOutputPath, schemaDefinitionTypes);
            break;
          }
          case 'graphql': {
            await mkdir(path.dirname(outputPath), {recursive: true});
            await writeFile(outputPath, printSchema(schema));
          }
        }
      }),
    );

    const details: SchemaBuildDetails = {
      project,
      schema,
      outputKinds: normalizedSchemaOutputKinds,
    };

    this.emit('schema:build:end', details);
    return details;
  }

  private async buildDocumentTypes(project: GraphQLProjectConfiguration) {
    const documentMap = this.projectDetails.get(project)!.documents;

    const documents = await globby(project.documentPatterns, {
      absolute: true,
      cwd: project.root,
      onlyFiles: true,
      ignore: [...project.excludePatterns, ...project.schemaPatterns],
    });

    await Promise.all(
      documents.map(async (filePath) => {
        await this.updateDocumentInProject(filePath, project);
      }),
    );

    const buildMap = new Map<string, Promise<DocumentBuildDetails>>();

    const load = (file: string) => {
      if (buildMap.has(file)) return buildMap.get(file)!;

      const promise = (async () => {
        const details = documentMap.get(file)!;
        await Promise.all([...details.dependencies].map(load));
        const buildDetails = await this.buildDocumentType(file, project);
        return buildDetails;
      })();

      buildMap.set(file, promise);
      return promise;
    };

    const results = await Promise.all([...documentMap.keys()].map(load));

    return results;
  }

  private async buildDocumentType(
    file: string,
    project: GraphQLProjectConfiguration,
  ): Promise<DocumentBuildDetails> {
    const projectDetails = this.projectDetails.get(project)!;
    const documentDetails = projectDetails.documents.get(file)!;

    const normalizedDocumentOutputKinds: DocumentOutputKind[] = [
      ...(getOptions(project).documents ?? []),
      {kind: 'types'},
    ];

    let resolvedOutputKind!: DocumentOutputKind;

    for (const documentOutputKind of normalizedDocumentOutputKinds) {
      if (
        await this.documentOutputKindMatchesDocument(
          documentOutputKind,
          file,
          project,
        )
      ) {
        resolvedOutputKind = documentOutputKind;
        break;
      }
    }

    const isType = resolvedOutputKind.kind === 'types';

    const outputPath = `${file}${isType ? '.d.ts' : '.ts'}`;

    const buildDetails: DocumentBuildDetails = {
      project,
      documentPath: file,
      outputKinds: [resolvedOutputKind],
      ...documentDetails,
    };

    try {
      const types = generateDocumentTypes(documentDetails, projectDetails, {
        kind: resolvedOutputKind,
        package: this.options.package,
        importPath: (type) => {
          const {schema: schemaOutputKinds} = getOptions(project);

          const inputTypes = schemaOutputKinds?.find(
            (schemaType): schemaType is SchemaOutputKindInputTypes =>
              SCHEMA_OUTPUT_KINDS_WITH_INPUT_TYPE_EXPORTS.has(schemaType.kind),
          );

          const outputPath =
            inputTypes &&
            (inputTypes.outputPath ??
              getDefaultSchemaOutputPath(project, {typesOnly: true}));

          if (outputPath == null) {
            throw new Error(
              `You must add at least one schemaTypes option with kind: 'inputTypes' or kind: 'definitions' when importing custom scalar or enum types in your query (encountered while importing type ${JSON.stringify(
                type.name,
              )})`,
            );
          }

          const normalizedOutputPath = normalizeSchemaTypesPath(
            outputPath,
            project,
            {
              isDefault: this.projects.length === 1,
            },
          );

          return normalizeRelativePath(
            path
              .relative(path.dirname(file), normalizedOutputPath)
              .replace(/(\.d)?\.ts$/, ''),
          );
        },
      });

      await writeFile(outputPath, types);

      this.emit('document:build:end', buildDetails);
    } catch (error) {
      this.emit('document:build:error', {...buildDetails, error: error as any});
    }

    return buildDetails;
  }

  private async documentOutputKindMatchesDocument(
    outputKind: DocumentOutputKind,
    documentPath: string,
    project: GraphQLProjectConfiguration,
  ) {
    if (outputKind.match == null) {
      return true;
    }

    let matchingDocuments = this.documentOutputKindMatchCache.get(outputKind);

    if (matchingDocuments) {
      if (!Array.isArray(matchingDocuments)) {
        matchingDocuments = await matchingDocuments;
      }
    } else {
      const globPromise = globby(outputKind.match, {
        cwd: project.root,
        absolute: true,
        ignore: ['**/node_modules'],
      });

      this.documentOutputKindMatchCache.set(outputKind, globPromise);

      matchingDocuments = await globPromise;
      this.documentOutputKindMatchCache.set(outputKind, matchingDocuments);
    }

    return matchingDocuments.includes(documentPath);
  }

  private async updateDocumentInProject(
    filePath: string,
    project: GraphQLProjectConfiguration,
  ) {
    const contents = (await readFile(filePath, 'utf8')).trim();
    if (contents.length === 0) return;

    const documentMap = this.projectDetails.get(project)!.documents;
    const {imports, source} = extractImports(contents);
    const normalizedImport = imports.map((imported) =>
      path.join(path.dirname(filePath), imported),
    );

    for (const imported of normalizedImport) {
      const dependedOn = documentMap.get(imported);

      if (dependedOn?.dependencies.has(filePath)) {
        throw new Error(
          `Circular dependency detected between ${filePath} and ${imported}`,
        );
      }
    }

    const document = parse(new Source(source, filePath));

    const provides: DocumentDetails['provides'] = new Set();

    for (const definition of document.definitions) {
      switch (definition.kind) {
        case 'FragmentDefinition': {
          provides.add({
            type: 'fragment',
            name: definition.name.value,
          });
          break;
        }
        case 'OperationDefinition': {
          if (definition.operation === 'subscription') {
            break;
          }

          provides.add({
            type: definition.operation,
            name: definition.name?.value,
          });

          break;
        }
      }
    }

    documentMap.set(filePath, {
      path: filePath,
      provides,
      document,
      dependencies: new Set(normalizedImport),
    });
  }
}

function getOptions(project: GraphQLProjectConfiguration): QuiltExtensions {
  const quiltExtensions = project.extensions.quilt ?? {};

  const schema = [...(quiltExtensions.schema ?? [])];

  // If we have documents, we will always generate input types, because the documents
  // will need to import their referenced scalars and enums.
  if (
    project.documentPatterns.length > 0 &&
    !schema.some((outputKind) =>
      SCHEMA_OUTPUT_KINDS_WITH_INPUT_TYPE_EXPORTS.has(outputKind.kind),
    )
  ) {
    schema.push({kind: 'inputTypes'});
  }

  return {
    ...quiltExtensions,
    schema,
  };
}

function normalizeSchemaTypesPath(
  outputPath: string,
  project: GraphQLProjectConfiguration,
  {isDefault = false} = {},
) {
  const isTypeFile = path.extname(outputPath) === '.ts';
  return path.resolve(
    project.root,
    isTypeFile
      ? outputPath
      : path.join(
          outputPath,
          isDefault ? 'index.d.ts' : `${project.name}.d.ts`,
        ),
  );
}

function getDefaultSchemaOutputPath(
  {name, schemaPatterns}: GraphQLProjectConfiguration,
  {typesOnly = true}: {typesOnly?: boolean},
) {
  const firstProbablyFileSchemaPattern = schemaPatterns.find(
    (pattern) => !isGlob(pattern),
  );

  if (firstProbablyFileSchemaPattern) {
    return `${firstProbablyFileSchemaPattern}${typesOnly ? '.d.ts' : '.ts'}`;
  }

  throw new Error(
    `Could not get a default path for the the \`${name}\` GraphQL project. You’ll need to add an explicit outputPath in your GraphQL config file.`,
  );
}

function normalizeRelativePath(relativePath: string) {
  return relativePath.startsWith(`.${path.sep}`) ||
    relativePath.startsWith(`..${path.sep}`)
    ? relativePath
    : `.${path.sep}${relativePath}`;
}
