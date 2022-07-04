import {promisify} from 'util';
import {exec} from 'child_process';
import type {ExecOptions, PromiseWithChild} from 'child_process';
import {writeFile, readFile, mkdir, rm} from 'fs/promises';
import * as path from 'path';

import {copy} from 'fs-extra';
import {customAlphabet} from 'nanoid';
import getPort from 'get-port';
import {chromium} from 'playwright';
import {fetch} from '@remix-run/web-fetch';
import type {
  Page,
  Browser as PlaywrightBrowser,
  BrowserContext as PlaywrightBrowserContext,
} from 'playwright';

import type {Performance} from '@quilted/quilt';

export {stripIndent} from 'common-tags';
export {getPort};

export interface FileSystem {
  readonly root: string;
  resolve(...parts: string[]): string;
  read(file: string): Promise<string>;
  write(files: Record<string, string>): Promise<void>;
  write(file: string, content: string): Promise<void>;
  remove(file: string): Promise<void>;
}

export interface Browser {
  open(
    url: URL | string,
    options?: Parameters<PlaywrightBrowser['newPage']>[0] & {
      customizeContext?(
        context: PlaywrightBrowserContext,
        options: {url: URL},
      ): void | Promise<void>;
    },
  ): Promise<Page>;
}

export type {Page};

type RunResult = PromiseWithChild<{stdout: string; stderr: string}>;

export interface Command {
  readonly quilt: QuiltCli;
  run(command: string, options?: ExecOptions): RunResult;
  node(script: string, options?: ExecOptions): RunResult;
}

export interface QuiltCli {
  build(options?: ExecOptions): RunResult;
  typeCheck(options?: ExecOptions): RunResult;
}

export interface Workspace {
  readonly fs: FileSystem;
  readonly command: Command;
  readonly browser: Browser;
}

const execAsync = promisify(exec);
const monorepoRoot = path.resolve(__dirname, '../..');
const fixtureRoot = path.resolve(__dirname, 'fixtures');
const quiltFromSourceScript = path.join(
  monorepoRoot,
  'scripts/quilt-from-source.js',
);

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

  const {debug = false, name = `test-${nanoid()}`, fixture} = options;

  const root = path.join(__dirname, `output/${name}`);

  const teardownActions: (() => void | Promise<void>)[] = [];

  const resolve = (...parts: string[]) => path.resolve(root, ...parts);

  const runCommand = (command: string, options?: ExecOptions) => {
    const result = execAsync(command, {
      ...options,
      cwd: root,
      env: {...process.env, ...options?.env},
    });

    if (debug) {
      result.child.stdout?.pipe(process.stdout);
      result.child.stderr?.pipe(process.stderr);
    }

    teardownActions.push(() => {
      if (!result.child.killed) result.child.kill();
    });

    return result;
  };

  const runNode = (command: string, options?: ExecOptions) => {
    return runCommand(`${process.execPath} ${command}`, options);
  };

  const runQuiltFromSource = (command: string, options?: ExecOptions) => {
    return runNode(`${quiltFromSourceScript} ${command}`, options);
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
    browser: {
      async open(urlOrString, {customizeContext, ...options} = {}) {
        const url =
          typeof urlOrString === 'string' ? new URL(urlOrString) : urlOrString;

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

        teardownActions.push(async () => {
          await page.close();
          await context.close();
        });

        await page.goto(url.href);

        return page;
      },
    },
    command: {
      quilt: {
        build: (...args) => runQuiltFromSource('build', ...args),
        typeCheck: (...args) => runQuiltFromSource('type-check', ...args),
      },
      run: (...args) => runCommand(...args),
      node: (...args) => runNode(...args),
    },
  };

  try {
    await rm(root, {force: true, recursive: true});

    if (fixture) {
      await copy(path.join(fixtureRoot, fixture), root);

      const packageJson = JSON.parse(await workspace.fs.read('package.json'));
      packageJson.name = path.basename(root);
      await workspace.fs.write(
        'package.json',
        JSON.stringify(packageJson, null, 2),
      );
    }

    const result = await action(workspace);
    return result;
  } finally {
    await Promise.all(teardownActions.map((action) => action()));

    if (!debug) {
      await rm(root, {force: true, recursive: true});
    }
  }
}

interface BuildAndRunOptions {
  env?: Record<string, string>;
}

export async function buildAppAndRunServer(
  {command, fs}: Workspace,
  {env}: BuildAndRunOptions = {},
) {
  await command.quilt.build({env});

  const port = await getPort();
  const url = new URL(`http://localhost:${port}`);

  const server = startServer(async () => {
    await command.node(fs.resolve('build/server/index.js'), {
      env: {PORT: String(port)},
    });
  });

  await waitForUrl(url);

  return {
    url,
    server,
  };
}

export async function startServer(start: () => Promise<any>) {
  try {
    await start();
  } catch (error) {
    // Ignore errors from killing the server at the end of tests
    if ((error as {signal?: string})?.signal === 'SIGTERM') return;
    throw error;
  }
}

export async function waitForUrl(url: URL | string, {timeout = 500} = {}) {
  const startedAt = Date.now();

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      await fetch(url);
      break;
    } catch {
      // intentional noop
    }

    if (Date.now() - startedAt > timeout) {
      throw new Error(`Server at ${url.toString()} did not start up in time`);
    }

    await sleep(25);
  }
}

function sleep(time: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, time);
  });
}

declare global {
  interface Window {
    readonly Quilt?: {
      readonly E2E?: {
        Performance?: Performance;
      };
    };
  }
}

export async function buildAppAndOpenPage(
  workspace: Workspace,
  {
    build,
    path = '/',
    javaScriptEnabled = true,
    ...options
  }: NonNullable<Parameters<Browser['open']>[1]> & {
    path?: string;
    build?: BuildAndRunOptions;
  } = {},
) {
  const {url, server} = await buildAppAndRunServer(workspace, build);
  const targetUrl = new URL(path, url);

  const page = await workspace.browser.open(targetUrl, {
    ...options,
    javaScriptEnabled,
  });

  page.on('console', async (message) => {
    for (const arg of message.args()) {
      // eslint-disable-next-line no-console
      console[message.type() as 'log'](await arg.jsonValue());
    }
  });

  page.on('pageerror', (error) => {
    // eslint-disable-next-line no-console
    console.log(`page error in headless browser`);
    // eslint-disable-next-line no-console
    console.log(error);
  });

  page.on('requestfailed', (request) => {
    // eslint-disable-next-line no-console
    console.log(
      `failed request: ${request.url()} (${request.failure()?.errorText})`,
    );
  });

  page.on('load', (page) => {
    // eslint-disable-next-line no-console
    console.log(`browser navigated to ${page.url()}`);
  });

  await waitForPerformanceNavigation(page, {
    to: targetUrl,
    checkCompleteNavigations: true,
  });

  return {page, url: targetUrl, server};
}

export async function waitForPerformanceNavigation(
  page: Page,
  {
    to = '',
    action,
    checkCompleteNavigations = false,
  }: {
    to?: URL | string;
    checkCompleteNavigations?: boolean;
    action?(page: Page): Promise<void>;
  },
) {
  const url = typeof to === 'string' ? new URL(to, page.url()) : to;

  if (checkCompleteNavigations && action != null) {
    await action(page);
  }

  const navigationFinished = page.evaluate(
    async ({href, checkCompleteNavigations}) => {
      const performance = window.Quilt?.E2E?.Performance;

      if (performance == null) return;

      if (
        checkCompleteNavigations &&
        performance.navigations.some(
          (navigation) => navigation.target.href === href,
        )
      ) {
        return;
      }

      await new Promise<void>((resolve) => {
        const stopListening = performance.on('navigation', (navigation) => {
          if (navigation.target.href === href) {
            stopListening();
            resolve();
          }
        });
      });
    },
    {href: url.href, checkCompleteNavigations},
  );

  if (!checkCompleteNavigations && action != null) {
    await action(page);
  }

  await navigationFinished;
}
