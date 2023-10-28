import * as fs from 'fs';
import * as path from 'path';
import {fileURLToPath} from 'url';
import type {BuiltInParserName} from 'prettier';
export {prompt} from '@quilted/cli-kit';

export function loadTemplate(
  name:
    | 'package'
    | 'app-basic'
    | 'app-empty'
    | 'app-graphql'
    | 'app-trpc'
    | 'module'
    | 'server-basic'
    | 'workspace'
    | 'workspace-simple'
    | 'github'
    | 'vscode',
) {
  let templateRootPromise: Promise<string> | undefined;

  return {
    async copy(to: string, handleFile?: (file: string) => boolean) {
      templateRootPromise ??= templateDirectory(name);
      const templateRoot = await templateRootPromise;
      const targetRoot = path.resolve(to);

      const files = fs
        .readdirSync(templateRoot)
        .filter((file) => !path.basename(file).startsWith('.'));

      for (const file of files) {
        if (handleFile) {
          if (!handleFile(file)) {
            continue;
          }
        }

        const targetPath = path.join(
          targetRoot,
          file.startsWith('_') ? `.${file.slice(1)}` : file,
        );

        copy(path.join(templateRoot, file), targetPath);
      }
    },
    async read(file: string) {
      templateRootPromise ??= templateDirectory(name);
      const templateRoot = await templateRootPromise;

      return fs.readFileSync(path.join(templateRoot, file), {encoding: 'utf8'});
    },
    async has(file: string) {
      templateRootPromise ??= templateDirectory(name);
      const templateRoot = await templateRootPromise;

      return fs.existsSync(path.join(templateRoot, file));
    },
  };
}

export interface OutputTarget {
  readonly root: string;
  read(file: string): Promise<string>;
  write(file: string, content: string): Promise<void>;
}

export function createOutputTarget(target: string): OutputTarget {
  return {
    root: target,
    read(file: string) {
      return fs.promises.readFile(path.resolve(target, file), {
        encoding: 'utf8',
      });
    },
    async write(file: string, content: string) {
      await writeFile(path.resolve(target, file), content);
    },
  };
}

let packageRootPromise: Promise<string> | undefined;

async function templateDirectory(
  name:
    | 'package'
    | 'app-basic'
    | 'app-empty'
    | 'app-graphql'
    | 'app-trpc'
    | 'module'
    | 'server-basic'
    | 'workspace'
    | 'workspace-simple'
    | 'github'
    | 'vscode',
) {
  return path.join(await getPackageRoot(), 'templates', name);
}

async function getPackageRoot(): Promise<string> {
  if (!packageRootPromise) {
    packageRootPromise = (async () => {
      const {packageDirectory} = await import('pkg-dir');

      return packageDirectory({
        cwd: path.dirname(fileURLToPath(import.meta.url)),
      });
    })();
  }

  return packageRootPromise;
}

export function toValidPackageName(projectName: string) {
  return projectName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/^[._]/, '')
    .replace(/[^a-z0-9-~@/]+/g, '-');
}

function copy(source: string, destination: string) {
  const stat = fs.statSync(source);
  if (stat.isDirectory()) {
    copyDirectory(source, destination);
  } else {
    fs.copyFileSync(source, destination);
  }
}

async function copyDirectory(source: string, destination: string) {
  fs.mkdirSync(destination, {recursive: true});
  for (const file of fs.readdirSync(source)) {
    const srcFile = path.resolve(source, file);
    const destFile = path.resolve(destination, file);
    copy(srcFile, destFile);
  }
}

export async function writeFile(file: string, content: string) {
  await fs.promises.writeFile(file, content);
}

export async function isEmpty(path: string) {
  return fs.readdirSync(path).length === 0;
}

export async function emptyDirectory(dir: string) {
  if (!fs.existsSync(dir)) {
    return;
  }

  for (const file of fs.readdirSync(dir)) {
    fs.rmSync(path.resolve(dir, file), {force: true, recursive: true});
  }
}

export function relativeDirectoryForDisplay(relativeDirectory: string) {
  return relativeDirectory.startsWith('.')
    ? relativeDirectory
    : `.${path.sep}${relativeDirectory}`;
}

export async function format(
  content: string,
  {as: parser}: {as: BuiltInParserName},
) {
  const [
    {format: rootFormat, default: prettier},
    babel,
    typescript,
    yaml,
    estree,
  ] = await Promise.all([
    import('prettier/standalone'),
    import('prettier/plugins/babel'),
    import('prettier/plugins/typescript'),
    import('prettier/plugins/yaml'),
    // @ts-expect-error Types are not generated correctly for this entry
    import('prettier/plugins/estree'),
  ]);

  // CJS workaround
  const format = rootFormat ?? prettier.format;

  return format(content, {
    arrowParens: 'always',
    bracketSpacing: false,
    singleQuote: true,
    trailingComma: 'all',
    parser,
    plugins: [babel, typescript, yaml, estree],
  });
}

export function mergeDependencies(
  first: Record<string, string> = {},
  second: Record<string, string> = {},
) {
  const all = {...first, ...second};
  const merged: Record<string, string> = {};

  for (const [key, value] of Object.entries(all).sort(([keyOne], [keyTwo]) =>
    keyOne.localeCompare(keyTwo),
  )) {
    merged[key] = value;
  }

  return merged;
}

const PACKAGE_JSON_DEPENDENCY_KEYS = new Set([
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'peerDependenciesMeta',
]);

// Merges a project and workspace package.json together, with the following nitpicky preferences:
//
// - Take all the project’s fields in the order they appear by default
// - Merge the relevant dependencies together
// - Projects don’t come with `scripts` by default, but that should go before the first dependency list
// - If there are other keys in the workspace package.json, they should go last, in the order they appeared
export function mergeWorkspaceAndProjectPackageJsons(
  projectPackageJson: Record<string, unknown>,
  workspacePackageJson: Record<string, unknown>,
) {
  const newPackageJson: Record<string, unknown> = {};
  const seenKeys = new Set<string>();
  let hasHandledScriptsField = false;

  for (const [key, value] of Object.entries(projectPackageJson)) {
    seenKeys.add(key);

    const isDependencyKey = PACKAGE_JSON_DEPENDENCY_KEYS.has(key);

    if (key === 'scripts' || (isDependencyKey && !hasHandledScriptsField)) {
      newPackageJson.scripts = {
        ...(workspacePackageJson.scripts as any),
        ...(projectPackageJson.scripts as any),
      };
      hasHandledScriptsField = true;
      if (key === 'scripts') continue;
    }

    if (isDependencyKey) {
      newPackageJson[key] = mergeDependencies(
        value as any,
        workspacePackageJson[key] as any,
      );
    } else {
      newPackageJson[key] = value;
    }
  }

  for (const [key, value] of Object.entries(workspacePackageJson)) {
    if (seenKeys.has(key)) continue;
    // Merged workspace + project package.json means we are not in a monorepo
    if (key === 'workspaces') continue;
    newPackageJson[key] = value;
  }

  return newPackageJson;
}
