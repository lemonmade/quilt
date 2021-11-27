import {tmpdir} from 'os';
import {promisify} from 'util';
import {exec} from 'child_process';
import type {ExecOptions, PromiseWithChild} from 'child_process';
import {writeFile, readFile, mkdir, rm} from 'fs/promises';
import * as path from 'path';

import getPort from 'get-port';
import {chromium} from 'playwright';
import type {Page, Browser as PlaywrightBrowser} from 'playwright';

export {stripIndent} from 'common-tags';

export interface FileSystem {
  readonly root: string;
  resolve(...parts: string[]): string;
  read(file: string): Promise<string>;
  write(files: Record<string, string>): Promise<void>;
  write(file: string, content: string): Promise<void>;
}

export interface Browser {
  open(
    url: URL | string,
    options?: Parameters<PlaywrightBrowser['newPage']>[0],
  ): Promise<Page>;
}

export type {Page};

type RunResult = PromiseWithChild<{stdout: string; stderr: string}>;

export interface Command {
  readonly sewingKit: SewingKitCli;
  run(command: string, options?: ExecOptions): RunResult;
  node(script: string, options?: ExecOptions): RunResult;
  yarn(command: string, options?: ExecOptions): RunResult;
}

export interface SewingKitCli {
  build(): RunResult;
}

export interface Workspace {
  readonly fs: FileSystem;
  readonly command: Command;
  readonly browser: Browser;
}

const execAsync = promisify(exec);
const monorepoRoot = path.resolve(__dirname, '../..');
const sewingKitFromSourceScript = path.join(
  monorepoRoot,
  'scripts/sewing-kit-from-source.js',
);

export async function withWorkspace<T>(
  action: (workspace: Workspace) => T | Promise<T>,
): Promise<T> {
  // const root = tmpdir();
  const root = path.join(__dirname, 'output/test1');

  const teardown = async () => {};

  const resolve = (...parts: string[]) => path.resolve(root, ...parts);

  const runCommand = (command: string, options?: ExecOptions) => {
    const result = execAsync(command, {
      ...options,
      cwd: root,
      env: {...process.env, ...options?.env},
    });

    return result;
  };

  const runNode = (command: string, options?: ExecOptions) => {
    return runCommand(`${process.execPath} ${command}`, options);
  };

  const runSewingKitFromSource = (command: string, options?: ExecOptions) => {
    return runNode(`${sewingKitFromSourceScript} ${command}`, options);
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
      async open(url, options = {}) {
        // TODO store a reference for cleanup
        const browser = await chromium.launch();
        const page = await browser.newPage({
          viewport: {height: 800, width: 600},
          ...options,
        });
        await page.goto(typeof url === 'string' ? url : url.href);
        return page;
      },
    },
    command: {
      sewingKit: {
        build: (...args) => runSewingKitFromSource('build', ...args),
      },
      run: (...args) => runCommand(...args),
      node: (...args) => runNode(...args),
      yarn: (command, options) => runCommand(`yarn ${command}`, options),
    },
  };

  try {
    await rm(root, {force: true, recursive: true});
    const result = await action(workspace);
    return result;
  } catch (error) {
    await teardown();
    throw error;
  }
}

export async function buildAppAndRunServer({command, fs}: Workspace) {
  await command.sewingKit.build();

  const port = await getPort();

  // TODO make sure to add this to workspace teardown
  const server = command.node(fs.resolve('build/server/index.js'), {
    env: {PORT: String(port)},
  });

  return {
    url: new URL(`http://localhost:${port}`),
    server,
  };
}

declare global {
  interface Window {
    readonly Quilt?: {
      readonly E2E?: {
        Performance?: import('@quilted/performance').Performance;
      };
    };
  }
}

export async function buildAppAndOpenPage(
  workspace: Workspace,
  {
    path = '/',
    ...options
  }: NonNullable<Parameters<Browser['open']>[1]> & {path?: string} = {},
) {
  const {url, server} = await buildAppAndRunServer(workspace);
  const targetUrl = new URL(path, url);

  const page = await workspace.browser.open(targetUrl, {...options});

  page.on('console', async (message) => {
    for (const arg of message.args()) {
      // eslint-disable-next-line no-console
      console[message.type()](await arg.jsonValue());
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
      `failed request: ${request.url()} (${request.failure().errorText})`,
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
    to,
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
