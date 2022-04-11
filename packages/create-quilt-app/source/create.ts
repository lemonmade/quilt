/* eslint no-console: off */

import * as fs from 'fs';
import * as path from 'path';
import {EOL} from 'os';
import {fileURLToPath} from 'url';

import prompts from 'prompts';
import type {Answers} from 'prompts';
import arg from 'arg';
import color from 'colorette';
import {packageDirectory} from 'pkg-dir';

const argv = arg({});
const cwd = process.cwd();

const RENAME_FILES = new Map(
  Object.entries({
    _gitignore: '.gitignore',
    _prettierignore: '.prettierignore',
  }),
);

class CancellationError extends Error {}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function run() {
  let targetDirectory = argv._[0];
  const defaultProjectName = targetDirectory || 'quilt-app';

  let result: Answers<'name' | 'overwrite'>;

  try {
    result = await prompts<'name' | 'overwrite'>(
      [
        {
          type: targetDirectory ? null : 'text',
          name: 'name',
          message: 'Project name:',
          initial: defaultProjectName,
          onState: (state) => {
            targetDirectory = state.value.trim() || defaultProjectName;
          },
        },
        {
          type: () =>
            !fs.existsSync(targetDirectory!) || isEmpty(targetDirectory!)
              ? (null as any)
              : 'confirm',
          name: 'overwrite',
          message: () =>
            `Target directory (${
              targetDirectory === '.' ? 'current directory' : targetDirectory
            }) is not empty. Remove existing files and continue?`,
          onState: (overwrite: boolean) => {
            if (overwrite === false) {
              throw new CancellationError();
            }
          },
        },
      ],
      {
        onCancel: () => {
          throw new CancellationError();
        },
      },
    );
  } catch (cancelled) {
    return;
  }

  const {overwrite} = result;
  const root = path.join(cwd, targetDirectory!);
  const packageName = toValidPackageName(targetDirectory!);

  if (overwrite) {
    emptyDirectory(root);
  } else if (!fs.existsSync(root)) {
    fs.mkdirSync(root);
  }

  console.log(`\nCreating Quilt app in ${color.magenta(root)}...`);

  const packageRoot = await packageDirectory({
    cwd: path.dirname(fileURLToPath(import.meta.url)),
  });

  const templateRoot = path.join(packageRoot!, 'template');

  const write = (file: string, content?: string) => {
    const targetPath = path.join(root, RENAME_FILES.get(file) ?? file);

    if (content) {
      fs.writeFileSync(targetPath, content);
    } else {
      copy(path.join(templateRoot, file), targetPath);
    }
  };

  const files = fs.readdirSync(templateRoot);
  for (const file of files) {
    if (file === 'package.json') {
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(templateRoot, file), {encoding: 'utf8'}),
      );

      packageJson.name = packageName;
      write(file, JSON.stringify(packageJson, null, 2) + EOL);

      continue;
    }

    write(file);
  }

  console.log(`\nDone! Here’s what you’ll need to do next:\n`);
  if (root !== cwd) {
    console.log(`  cd ${path.relative(cwd, root)}`);
  }
  console.log(`  pnpm install # install dependencies`);
  console.log(`  pnpm develop # run development server`);
  console.log();
}

function toValidPackageName(projectName: string) {
  return projectName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/^[._]/, '')
    .replace(/[^a-z0-9-~]+/g, '-');
}

function copy(source: string, destination: string) {
  const stat = fs.statSync(source);
  if (stat.isDirectory()) {
    copyDirectory(source, destination);
  } else {
    fs.copyFileSync(source, destination);
  }
}

function copyDirectory(source: string, destination: string) {
  fs.mkdirSync(destination, {recursive: true});
  for (const file of fs.readdirSync(source)) {
    const srcFile = path.resolve(source, file);
    const destFile = path.resolve(destination, file);
    copy(srcFile, destFile);
  }
}

function isEmpty(path: string) {
  return fs.readdirSync(path).length === 0;
}

function emptyDirectory(dir: string) {
  if (!fs.existsSync(dir)) {
    return;
  }

  for (const file of fs.readdirSync(dir)) {
    fs.rmSync(path.resolve(dir, file), {force: true, recursive: true});
  }
}
