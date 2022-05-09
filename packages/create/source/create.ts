/* eslint no-console: off */

import * as fs from 'fs';
import * as path from 'path';
import {EOL} from 'os';
import {fileURLToPath} from 'url';

import prompts from 'prompts';
import type {Answers} from 'prompts';
import arg from 'arg';
import * as color from 'colorette';
import {packageDirectory} from 'pkg-dir';

class CancellationError extends Error {}

const argv = arg({});
const cwd = process.cwd();

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function run() {
  const create = argv._[0];

  if (!create) {
    if (fs.existsSync('quilt.workspace.ts')) {
      await createProject();
    } else {
      await createWorkspace();
    }

    return;
  }

  switch (create) {
    case 'workspace': {
      await createWorkspace(argv._[1]);
      break;
    }
    case 'package': {
      await createPackage(argv._[1]);
      break;
    }
    case 'app': {
      await createApp();
      break;
    }
    default: {
      throw new Error(`Unknown argument: ${create}`);
    }
  }
}

async function createWorkspace(explicitName?: string) {
  if (fs.existsSync('quilt.workspace.ts')) {
    console.log(`\nYou’re already in a Quilt workspace!`);
    console.log();
    console.log(`Run one of the following to add projects to your workspace:`);
    console.log(`  pnpm create @quilted app # create a new app`);
    console.log(`  pnpm create @quilted package # create a new package`);
    return;
  }

  let targetDirectory = explicitName;
  const defaultName = targetDirectory || 'my-project';

  let result: Answers<'name' | 'overwrite'>;

  try {
    result = await prompts<'name' | 'overwrite'>(
      [
        {
          type: targetDirectory ? null : 'text',
          name: 'name',
          message: 'What would you like to name this workspace?',
          initial: defaultName,
          onState: (state) => {
            targetDirectory = state.value.trim() || defaultName;
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
    if (cancelled instanceof CancellationError) return;
    throw cancelled;
  }

  const {overwrite} = result;
  const root = path.join(cwd, targetDirectory!);
  const packageName = toValidPackageName(targetDirectory!);

  if (overwrite) {
    emptyDirectory(root);
  } else if (!fs.existsSync(root)) {
    fs.mkdirSync(root, {recursive: true});
  }

  console.log(
    `\nCreating Quilt workspace in ${color.cyan(path.relative(cwd, root))}...`,
  );

  const templateRoot = await templateDirectory('workspace');
  const template = createTemplateFileSystem(templateRoot, root);

  for (const file of template.files()) {
    if (file === 'package.json') {
      const packageJson = JSON.parse(template.read(file));
      packageJson.name = packageName;
      template.write(file, JSON.stringify(packageJson, null, 2) + EOL);
      continue;
    }

    template.copy(file);
  }

  console.log(`\nDone! Here’s what you’ll need to do next:\n`);
  console.log();
  if (root !== cwd) {
    console.log(`  cd ${path.relative(cwd, root)}`);
  }
  console.log(`  pnpm install # install dependencies`);
  console.log(
    `  git init && git add --all && git commit --message "Initial commit" # start your git history`,
  );
  console.log(
    `  pnpm create @quilted app # create an app in your workspace, or`,
  );
  console.log(
    `  pnpm create @quilted package # create a package in your workspace`,
  );
  console.log();
}

async function createProject() {
  const result = await prompts<'type'>([
    {
      type: 'select',
      name: 'type',
      message: 'What kind of project would you like to create?',
      choices: [
        {title: 'App', value: 'app'},
        {title: 'Package', value: 'package'},
      ],
    },
  ]);

  switch (result.type) {
    case 'package': {
      await createPackage();
      break;
    }
    case 'app': {
      await createApp();
      break;
    }
  }
}

async function createPackage(explicitName?: string) {
  let name!: string;
  let scope: string | undefined;
  let targetDirectory!: string;

  let result: Answers<'name' | 'overwrite'>;

  try {
    result = await prompts<'name' | 'overwrite'>(
      [
        {
          type: 'text',
          name: 'name',
          message: 'What would you like to name this package?',
          initial: toValidPackageName(explicitName ?? ''),
          onState: (state) => {
            name = toValidPackageName(state.value);
            scope = name.match(/^@[^/]+/)?.[0] ?? undefined;
            targetDirectory = path.join(
              'packages',
              scope ? name.replace(`${scope}/`, '') : name,
            );
          },
        },
        {
          type: () =>
            !fs.existsSync(targetDirectory!) || isEmpty(targetDirectory!)
              ? (null as any)
              : 'confirm',
          name: 'overwrite',
          message: () =>
            `Target directory (${targetDirectory}) is not empty. Remove existing files and continue?`,
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
    if (cancelled instanceof CancellationError) return;
    throw cancelled;
  }

  const {overwrite} = result;

  const root = path.join(cwd, targetDirectory!);

  if (overwrite) {
    emptyDirectory(root);
  } else if (!fs.existsSync(root)) {
    fs.mkdirSync(root, {recursive: true});
  }

  console.log(
    `\nCreating ${color.cyan(name)} package in ${color.cyan(
      path.relative(cwd, root),
    )}...`,
  );

  const templateRoot = await templateDirectory('package');
  const template = createTemplateFileSystem(templateRoot, root);

  for (const file of template.files()) {
    switch (file) {
      case 'package.json': {
        const packageJson = JSON.parse(template.read(file));
        packageJson.name = name;

        if (scope) {
          packageJson.publishConfig[`${scope}:registry`] =
            'https://registry.npmjs.org';
        }

        template.write(file, JSON.stringify(packageJson, null, 2) + EOL);
        break;
      }
      case 'README.md': {
        template.write(
          file,
          template.read(file).replace('# Package', `# ${name}`),
        );
        break;
      }
      default: {
        template.copy(file);
      }
    }

    if (file === 'package.json') {
      const packageJson = JSON.parse(template.read(file));
      packageJson.name = name;

      if (scope) {
        packageJson.publishConfig[`${scope}:registry`] =
          'https://registry.npmjs.org';
      }

      template.write(file, JSON.stringify(packageJson, null, 2) + EOL);
      continue;
    }

    template.copy(file);
  }

  console.log(`\nDone! Your new package has been created.`);
  console.log(`Get started by adding source code in the \`source\` directory.`);
  console.log(
    `Make sure to edit the \`description\` and \`repository\` sections of your \`package.json\` before publishing.`,
  );
  console.log(`Have fun!`);
  console.log();
}

async function createApp() {
  const root = path.join(cwd, 'app');

  if (fs.existsSync(root)) {
    const {overwrite} = await prompts<'overwrite'>([
      {
        type: 'confirm',
        name: 'overwrite',
        message: () =>
          `Target directory (./app) is not empty. Remove existing files and continue?`,
      },
    ]);

    if (!overwrite) return;

    emptyDirectory(root);
  } else if (!fs.existsSync(root)) {
    fs.mkdirSync(root, {recursive: true});
  }

  console.log(`\nCreating app in ${color.cyan(path.relative(cwd, root))}...`);

  const templateRoot = await templateDirectory('app');
  const template = createTemplateFileSystem(templateRoot, root);

  for (const file of template.files()) {
    if (file === 'package.json') {
      const packageJson = JSON.parse(template.read(file));
      packageJson.name = 'app';
      template.write(file, JSON.stringify(packageJson, null, 2) + EOL);
      continue;
    }

    template.copy(file);
  }

  console.log(`\nDone! Your new app has been created.`);
  console.log(`Get started by:`);
  console.log(`  * running \`pnpm develop\` to start the development server`);
  console.log(`  * editing code in the \`app\` directory`);
  console.log(`Have fun!`);
  console.log();
}

// Utilities

function createTemplateFileSystem(templateRoot: string, targetRoot: string) {
  return {
    write(file: string, content: string) {
      const targetPath = path.join(
        targetRoot,
        file.startsWith('_') ? `.${file.slice(1)}` : file,
      );
      fs.writeFileSync(targetPath, content);
    },
    copy(file: string) {
      const targetPath = path.join(
        targetRoot,
        file.startsWith('_') ? `.${file.slice(1)}` : file,
      );
      copy(path.join(templateRoot, file), targetPath);
    },
    read(file: string) {
      return fs.readFileSync(path.join(templateRoot, file), {encoding: 'utf8'});
    },
    files() {
      return fs.readdirSync(templateRoot);
    },
  };
}

async function templateDirectory(name: 'package' | 'app' | 'workspace') {
  const packageRoot = await packageDirectory({
    cwd: path.dirname(fileURLToPath(import.meta.url)),
  });

  return path.join(packageRoot, 'templates', name);
}

function toValidPackageName(projectName: string) {
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
