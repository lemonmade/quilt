import {ChildProcess, spawn} from 'child_process';
import type {SpawnOptions, PromiseWithChild} from 'child_process';
import {writeFile, readFile, mkdir, rm} from 'fs/promises';
import * as path from 'path';

import {copy} from 'fs-extra';
import {customAlphabet} from 'nanoid';
import getPort from 'get-port';
import {chromium} from 'playwright';
import type {
  Page,
  Browser as PlaywrightBrowser,
  BrowserContext as PlaywrightBrowserContext,
} from 'playwright';
import {afterAll} from 'vitest';

import {sleep} from '@quilted/events';

export {stripIndent, stripIndent as multiline} from 'common-tags';
export {getPort};

export interface FileSystem {
  readonly root: string;
  resolve(...parts: string[]): string;
  read(file: string): Promise<string>;
  write(files: Record<string, string>): Promise<void>;
  write(file: string, content: string): Promise<void>;
  remove(file: string): Promise<void>;
}

export type {Page};

type RunResult = PromiseWithChild<{
  stdout: string;
  stderr: string;
  child: ChildProcess;
}>;

export interface Command {
  run(command: string, options?: SpawnOptions): RunResult;
  pnpm(command: string, options?: SpawnOptions): RunResult;
  node(script: string, options?: SpawnOptions): RunResult;
}

export interface Workspace extends AsyncDisposable {
  readonly fs: FileSystem;
  readonly command: Command;
  readonly debugging: boolean;
  beforeDispose(action: () => void | Promise<void>): void;
}

export interface Server extends AsyncDisposable {
  readonly url: URL;
  readonly fetch: typeof fetch;
  openPage(
    url?: URL | string,
    options?: Parameters<PlaywrightBrowser['newPage']>[0] & {
      debug?: boolean;
      customizeContext?(
        context: PlaywrightBrowserContext,
        options: {url: URL},
      ): void | Promise<void>;
    },
  ): Promise<Page>;
}

const fixtureRoot = path.resolve(__dirname, 'fixtures');

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz1234567890', 6);

let browserPromise: Promise<PlaywrightBrowser> | undefined;

afterAll(async () => {
  if (browserPromise == null) return;
  await (await browserPromise).close();
  browserPromise = undefined;
});

export type Fixture = 'basic-app' | 'empty-app' | 'basic-api';

export interface WorkspaceOptions {
  debug?: boolean;
  name?: string;
  fixture?: Fixture;
}
export type WorkspaceAction<T> = (workspace: Workspace) => T | Promise<T>;

export async function withWorkspace<T>(action: WorkspaceAction<T>): Promise<T>;
export async function withWorkspace<T>(
  options: WorkspaceOptions,
  action: WorkspaceAction<T>,
): Promise<T>;
export async function withWorkspace<T>(
  optionsOrAction: WorkspaceOptions | WorkspaceAction<T>,
  definitelyAction?: WorkspaceAction<T>,
): Promise<T> {
  let action: WorkspaceAction<T>;
  let options: WorkspaceOptions;

  if (typeof optionsOrAction === 'function') {
    action = optionsOrAction;
    options = {};
  } else {
    options = optionsOrAction ?? {};
    action = definitelyAction!;
  }

  await using workspace = await createWorkspace(options);
  const result = await action(workspace);
  return result;
}

export async function createWorkspace({
  debug = false,
  name = debug ? 'test' : `test-${nanoid()}`,
  fixture,
}: WorkspaceOptions = {}) {
  const root = path.join(__dirname, `output/${name}`);

  const teardownActions: (() => void | Promise<void>)[] = [];

  const resolve = (...parts: string[]) => path.resolve(root, ...parts);

  const runCommand = (command: string, options?: SpawnOptions): RunResult => {
    const [executable, ...args] = command.split(' ');
    const child = spawn(executable!, args, {
      ...options,
      cwd: root,
      env: {...process.env, ...options?.env},
      stdio: options?.stdio ?? 'pipe',
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    if (debug) {
      child.stdout?.pipe(process.stdout);
      child.stderr?.pipe(process.stderr);
    }

    teardownActions.push(() => {
      if (!child.killed) child.kill();
    });

    const promise = new Promise<Awaited<RunResult>>((resolve, reject) => {
      child.on('error', reject);
      child.on('exit', () => {
        resolve({stdout, stderr, child});
      });
    });

    Reflect.defineProperty(promise, 'child', {value: child});

    return promise as any;
  };

  const runNode = (command: string, options?: SpawnOptions) => {
    return runCommand(`${process.execPath} ${command}`, options);
  };

  const writeFileInProject = async (file: string, content: string) => {
    const fullPath = resolve(file);
    await mkdir(path.dirname(fullPath), {recursive: true});
    await writeFile(fullPath, content);
  };

  const workspace: Workspace = {
    fs: {
      root,
      resolve,
      async remove(file) {
        await rm(resolve(file), {force: true, recursive: true});
      },
      async read(file) {
        const contents = await readFile(resolve(file), {
          encoding: 'utf8',
        });

        return contents;
      },
      async write(
        fileOrFiles: string | Record<string, string>,
        maybeContent?: string,
      ) {
        if (typeof fileOrFiles === 'string') {
          await writeFileInProject(fileOrFiles, maybeContent!);
        } else {
          await Promise.all(
            Object.entries(fileOrFiles).map(([file, content]) =>
              writeFileInProject(file, content),
            ),
          );
        }
      },
    },
    command: {
      run: (...args) => runCommand(...args),
      pnpm: (command, options) => runCommand(`pnpm ${command}`, options),
      node: (...args) => runNode(...args),
    },
    debugging: debug,
    beforeDispose(action) {
      teardownActions.push(action);
    },
    [Symbol.asyncDispose]: async () => {
      await Promise.all(teardownActions.map((action) => action()));

      if (!debug) {
        await rm(root, {force: true, recursive: true});
      }
    },
  };

  await rm(root, {force: true, recursive: true});

  if (fixture) {
    await copy(path.join(fixtureRoot, fixture), root);

    const packageJson = JSON.parse(await workspace.fs.read('package.json'));
    packageJson.name = path.basename(root);
    await workspace.fs.write(
      'package.json',
      JSON.stringify(packageJson, null, 2) + '\n',
    );
  }

  return workspace;
}

interface BuildAndRunOptions {
  env?: Record<string, string>;
}

export async function startServer(
  workspace: Workspace,
  {
    port: explicitPort,
    path = 'build/server/server.js',
    build,
  }: {
    port?: number;
    path?: string;
    build?: BuildAndRunOptions | boolean;
  } = {},
): Promise<Server> {
  if (build !== false) {
    await workspace.command.pnpm('build', {
      env: typeof build === 'object' ? build?.env : undefined,
    });
  }

  const port = explicitPort ?? (await getPort());
  const url = new URL(`http://localhost:${port}`);

  const startCommand = workspace.command.node(path, {
    env: {PORT: String(port)},
  });

  workspace.beforeDispose(async () => {
    startCommand.child.kill();
  });

  startCommand.catch((error) => {
    // Ignore errors from killing the server at the end of tests
    if ((error as {signal?: string})?.signal === 'SIGTERM') return;
    console.error('Error running server:');
    console.error(error);
  });

  await waitForUrl(url);

  return {
    url,
    fetch(input, init) {
      const normalizedInput =
        typeof input === 'string' ? new URL(input, url) : input;
      return fetch(normalizedInput as any, init);
    },
    async openPage(
      target = '/',
      {debug = workspace.debugging, customizeContext, ...options} = {},
    ) {
      const targetUrl = new URL(target, url);

      browserPromise ??= chromium.launch();
      const browser = await browserPromise;
      const context = await browser.newContext({
        viewport: {height: 800, width: 600},
        ...options,
      });

      if (customizeContext) {
        await customizeContext(context, {url});
      }

      const page = await context.newPage();

      workspace.beforeDispose(async () => {
        await page.close();
        await context.close();
      });

      if (debug) {
        page.on('console', async (message) => {
          console.log('Browser console message:');

          for (const arg of message.args()) {
            console[message.type() as 'log'](await arg.jsonValue());
          }
        });

        page.on('pageerror', (error) => {
          console.log(`page error in headless browser`);
          console.log(error);
        });

        page.on('requestfailed', (request) => {
          console.log(
            `failed request: ${request.url()} (${request.failure()?.errorText})`,
          );
        });

        page.on('load', (page) => {
          console.log(`browser navigated to ${page.url()}`);
        });
      }

      await page.goto(targetUrl.href);

      return page;
    },
    [Symbol.asyncDispose]: async () => {
      startCommand.child.kill();

      await new Promise<void>((resolve) => {
        startCommand.child.once('exit', resolve);
      });
    },
  };
}

export async function waitForUrl(url: URL | string, {timeout = 500} = {}) {
  const startedAt = Date.now();

  while (true) {
    let lastError: unknown;

    try {
      await fetch(url, {redirect: 'manual'});
      break;
    } catch (error) {
      lastError = error;
    }

    if (Date.now() - startedAt > timeout) {
      throw new Error(`Server at ${url.toString()} did not start up in time`, {
        cause: lastError,
      });
    }

    await sleep(25);
  }
}
