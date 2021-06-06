/* eslint no-console: off */

import * as path from 'path';
import {EOL} from 'os';
import {spawn} from 'child_process';
import {mkdir, writeFile} from 'fs/promises';

import args from 'arg';
import chalk from 'chalk';
import dedent from 'ts-dedent';

interface Options {
  name: string;
}

const NAME = 'create-quilt-app';

const {
  _: [name],
} = args({});

if (name == null) {
  console.log(dedent`
    Please provide a project directory name:
      ${chalk.cyan(NAME)} ${chalk.green('my-app')}
    
    Run ${chalk.cyan(`${NAME} --help`)} to see all options.
  `);
  process.exit(1);
}

createProject({name});

async function createProject({name}: Options) {
  const root = path.resolve(name);

  console.log();
  console.log(`Creating a quilt project in ${chalk.green(root)}`);
  console.log();

  await mkdir(root, {recursive: true});

  await writeFile(
    path.join(root, 'package.json'),
    JSON.stringify({
      name,
      version: '0.0.0',
      private: true,
      scripts: {
        lint: 'sewing-kit lint',
        test: 'sewing-kit test',
        'type-check': 'sewing-kit type-check',
        develop: 'sewing-kit develop',
        start: 'sewing-kit develop',
        build: 'sewing-kit build',
      },
      workspaces: {
        packages: ['app', 'packages/*'],
      },
      devDependencies: {
        '@quilted/craft': '*',
      },
    }) + EOL,
  );

  await writeFile(
    path.join(root, '.gitignore'),
    dedent`
      # dependencies
      node_modules/

      # build
      build/
      coverage/
      .sewing-kit/

      # logs
      yarn-debug.log*
      yarn-error.log*

      # others
      .DS_Store
    ` + EOL,
  );

  await writeFile(
    path.join(root, 'sewing-kit.config.ts'),
    dedent`
      import {createWorkspace, quiltWorkspace} from '@quilted/craft';
      
      export default createWorkspace((workspace) => {
        workspace.use(quiltWorkspace());
      });
    ` + EOL,
  );

  process.chdir(root);

  console.log();
  console.log(`Installing dependencies with ${chalk.cyan('yarn')}`);
  console.log();

  await new Promise<void>((resolve, reject) => {
    const child = spawn('yarnpkg', ['install'], {stdio: 'inherit'});
    child.on('close', (code) => {
      if (code !== 0) {
        reject();
        return;
      }

      resolve();
    });
  });
}
