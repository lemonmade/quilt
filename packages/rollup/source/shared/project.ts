import * as path from 'path';
import {readFileSync} from 'fs';
import {fileURLToPath} from 'url';

import {glob, type GlobOptions} from 'glob';

const PROJECT_CACHE = new Map<string, Project>();

export class Project {
  static load(root: string | URL) {
    const resolvedRoot = resolveRoot(root);

    let project = PROJECT_CACHE.get(resolvedRoot);

    if (project == null) {
      project = new Project(resolvedRoot);
      PROJECT_CACHE.set(resolvedRoot, project);
    }

    return project;
  }

  readonly root: string;

  get path() {
    return this.root;
  }

  get name() {
    return this.packageJSON.name;
  }

  #packageJSON: PackageJSON | undefined;
  get packageJSON() {
    this.#packageJSON ??= new PackageJSON(this.root);
    return this.#packageJSON;
  }

  constructor(root: string | URL) {
    this.root = resolveRoot(root);
  }

  resolve(...segments: string[]) {
    return path.resolve(this.root, ...segments);
  }

  relative(to: string) {
    return path.relative(this.root, to);
  }

  glob(pattern: string | string[], options?: GlobOptions) {
    return glob(pattern, {
      ...options,
      absolute: true,
      cwd: this.root,
    }) as Promise<string[]>;
  }
}

export interface PackageJSONRaw {
  name: string;
  main?: string;
  private?: boolean;
  exports?: Record<string, string | Record<string, string>>;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  peerDependenciesMeta?: Record<string, {optional?: boolean}>;
  devDependencies?: Record<string, string>;
  [key: string]: unknown;
}

export class PackageJSON {
  readonly raw: PackageJSONRaw;
  readonly path: string;

  get name() {
    return this.raw.name;
  }

  constructor(rootOrPath: string) {
    this.path = rootOrPath.endsWith('package.json')
      ? rootOrPath
      : path.join(rootOrPath, 'package.json');
    this.raw = JSON.parse(readFileSync(this.path, 'utf8'));
  }
}

function resolveRoot(root: string | URL) {
  return typeof root === 'string' ? root : fileURLToPath(root);
}

export async function sourceEntriesForProject(project: Project) {
  const {main, exports} = project.packageJSON.raw;

  const entries: Record<string, string> = {};

  if (typeof main === 'string') {
    entries['.'] = await resolveTargetFileAsSource(main, project);
  }

  if (typeof exports === 'string') {
    entries['.'] = await resolveTargetFileAsSource(exports, project);
    return entries;
  } else if (exports == null || typeof exports !== 'object') {
    return entries;
  }

  for (const [exportPath, exportCondition] of Object.entries(
    exports as Record<string, null | string | Record<string, string>>,
  )) {
    let targetFile: string | null | undefined = null;

    if (exportCondition == null) continue;

    if (typeof exportCondition === 'string') {
      targetFile = exportCondition;
    } else {
      targetFile ??=
        exportCondition['source'] ??
        exportCondition['quilt:source'] ??
        exportCondition['quilt:esnext'] ??
        Object.values(exportCondition).find(
          (condition) =>
            typeof condition === 'string' && condition.startsWith('./build/'),
        );
    }

    if (targetFile == null) continue;

    const sourceFile = await resolveTargetFileAsSource(targetFile, project);

    entries[exportPath] = sourceFile;
  }

  return entries;
}

async function resolveTargetFileAsSource(file: string, project: Project) {
  const sourceFile = file.includes('/build/')
    ? (
        await project.glob(
          file
            .replace(/[/]build[/][^/]+[/]/, '/*/')
            .replace(/(\.d\.ts|\.[\w]+)$/, '.*'),
          {
            absolute: true,
            ignore: [project.resolve(file)],
          },
        )
      )[0]!
    : project.resolve(file);

  return sourceFile;
}
