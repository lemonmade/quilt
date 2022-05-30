import * as fs from 'fs';
import * as path from 'path';
import {fileURLToPath} from 'url';
import prompts from 'prompts';
import type {PromptObject} from 'prompts';
import type {BuiltInParserName} from 'prettier';

import {AbortError} from '@quilted/events';

export function loadTemplate(
  name:
    | 'package'
    | 'app-basic'
    | 'app-single-file'
    | 'workspace'
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
  };
}

export function createOutputTarget(target: string) {
  return {
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
    | 'app-single-file'
    | 'workspace'
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

export async function prompt(prompt: Omit<PromptObject, 'name'>) {
  const result = await prompts<'value'>(
    {name: 'value', ...prompt},
    {
      onCancel() {
        throw new AbortError();
      },
    },
  );

  return result.value;
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
  const [{format}] = await Promise.all([import('prettier')]);

  return format(content, {
    arrowParens: 'always',
    bracketSpacing: false,
    singleQuote: true,
    trailingComma: 'all',
    parser,
  });
}
