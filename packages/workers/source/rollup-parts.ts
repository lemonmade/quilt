import {posix} from 'path';
import {URLSearchParams} from 'url';

import {rollup} from 'rollup';
import type {Plugin, InputOptions, OutputOptions, OutputChunk} from 'rollup';
import {stripIndent} from 'common-tags';

import type {WorkerWrapper} from './types';
import {PREFIX} from './constants';
import {wrapperToSearchString} from './utilities';

const ENTRY_PREFIX = 'quilt-worker-entry:';
const MAGIC_MODULE_WORKER = '__quilt__/Worker.tsx';

export interface WorkerContext {
  readonly module: string;
  readonly wrapper: WorkerWrapper;
}

export interface PublicPathContext extends WorkerContext {
  readonly filename: string;
  readonly chunk: OutputChunk;
  readonly outputOptions: OutputOptions;
}

export type ValueOrGetter<T, Context extends WorkerContext = WorkerContext> =
  | T
  | ((context: Context) => T | Promise<T>);

export type ValueOrUpdateGetter<
  T,
  Context extends WorkerContext = WorkerContext,
> = T | ((current: T, context: Context) => T | Promise<T>);

export interface Options {
  /**
   * By default, this plugin uses `rollup().generate()` and attaches the
   * resulting in-memory chunk to your main rollup build. When rolling rollup
   * normally, this will output your asset to the file system when the main
   * rollup build calls `write()`. Some tools that wrap rollup, like Vite, do
   * don’t really call `write()`, so I can’t figure out how to make this approach
   * work with them. In those instances, you can instead pass `write: true` here,
   * which will then run `rollup().write()` on the worker bundle to actually output
   * it to the filesystem (you can customize the output with the `outputOptions`
   * option). You can then use the `publicPath()` option to control the URL that is
   * generated for each worker module such that the tool is able to route that request
   * to the written file. For example, in Vite, you can use the special `/@fs` prefix
   * for a URL:
   *
   * ```ts
   * import * as path from 'path';
   *
   * workers({
   *   write: true,
   *   publicPath({filename, outputOptions}) {
   *     return `/@fs${path.join(outputOptions.dir, filename)}`;
   *   },
   * })
   * ```
   */
  write?: ValueOrGetter<boolean>;
  plugins?: ValueOrUpdateGetter<Plugin[]>;
  inputOptions?: ValueOrUpdateGetter<InputOptions>;
  outputOptions?: ValueOrUpdateGetter<OutputOptions>;
  contentForWorker?: ValueOrGetter<string | undefined>;
  publicPath?: ValueOrGetter<string | undefined, PublicPathContext>;
}

export function workers({
  write = false,
  publicPath,
  contentForWorker = defaultContentForWorker,
  plugins = defaultPlugins,
  inputOptions = {},
  outputOptions = {},
}: Options = {}): Plugin {
  let parentInputOptions: InputOptions;
  const workerMap = new Map<string, OutputChunk>();

  return {
    name: '@quilted/workers',
    buildStart(inputOptions) {
      parentInputOptions = inputOptions;
    },
    async resolveId(source, importer) {
      if (!source.startsWith(PREFIX)) return null;

      const {workerId, wrapper} = getWorkerRequest(source.replace(PREFIX, ''));
      const resolvedWorker = await this.resolve(workerId, importer, {
        skipSelf: true,
      });

      if (resolvedWorker == null) return null;

      return `${PREFIX}${resolvedWorker.id}${wrapperToSearchString(wrapper)}`;
    },
    async load(id) {
      if (!id.startsWith(PREFIX)) return null;

      const {workerId, wrapper} = getWorkerRequest(id.replace(PREFIX, ''));

      const workerContext: WorkerContext = {module: workerId, wrapper};

      const workerPlugins: Plugin[] = [
        {
          name: '@quilted/workers/magic-modules',
          resolveId(source) {
            if (source.startsWith(ENTRY_PREFIX)) {
              return {id: source};
            }

            if (source === MAGIC_MODULE_WORKER) {
              return {id: workerId};
            }

            return null;
          },
          async load(id) {
            if (!id.startsWith(ENTRY_PREFIX)) return null;

            const {wrapper, workerId} = getWorkerRequest(
              id.replace(ENTRY_PREFIX, ''),
            );

            const context: WorkerContext = {module: workerId, wrapper};

            const content =
              typeof contentForWorker === 'function'
                ? await contentForWorker(context)
                : contentForWorker;
            return content ?? defaultContentForWorker(context);
          },
        },
        ...(typeof plugins === 'function'
          ? await plugins(
              [
                ...(parentInputOptions.plugins?.filter(
                  (plugin): plugin is Plugin => Boolean(plugin),
                ) ?? []),
              ],
              workerContext,
            )
          : plugins),
      ];

      const workerInput = `${ENTRY_PREFIX}${workerId}${wrapperToSearchString(
        wrapper,
      )}`;

      const baseInputOptions: InputOptions = {
        ...parentInputOptions,
        input: workerInput,
        plugins: workerPlugins,
      };

      const workerInputOptions =
        typeof inputOptions === 'function'
          ? await inputOptions(baseInputOptions, workerContext)
          : baseInputOptions;

      const baseOutputOptions: OutputOptions = {
        format: 'iife',
        inlineDynamicImports: true,
      };

      const workerOutputOptions =
        typeof outputOptions === 'function'
          ? await outputOptions(baseOutputOptions, workerContext)
          : {...baseOutputOptions, ...outputOptions};

      const shouldWrite =
        typeof write === 'function' ? await write(workerContext) : write;

      const bundle = await rollup(workerInputOptions);

      const result = await (shouldWrite
        ? bundle.write(workerOutputOptions)
        : bundle.generate(workerOutputOptions));

      const firstChunk = result.output.find(
        (output): output is OutputChunk => output.type === 'chunk',
      );

      if (firstChunk == null) {
        workerMap.delete(workerId);
        return null;
      }

      workerMap.set(workerId, firstChunk);

      for (const module of Object.keys(firstChunk.modules)) {
        this.addWatchFile(module);
      }

      const filename = firstChunk.fileName;
      let resolvedPublicPath = filename;

      if (typeof publicPath === 'string') {
        resolvedPublicPath = posix.join(publicPath, filename);
      } else if (typeof publicPath === 'function') {
        const returnedPublicPath = await publicPath({
          ...workerContext,
          filename,
          chunk: firstChunk,
          outputOptions: workerOutputOptions,
        });

        if (returnedPublicPath) {
          resolvedPublicPath = posix.join(returnedPublicPath, filename);
        }
      }

      return `export default ${JSON.stringify(resolvedPublicPath)};`;
    },
    generateBundle(_, bundle) {
      // We already wrote the chunks, no need to do it again I think?
      if (write) return;

      for (const chunk of workerMap.values()) {
        if (chunk.fileName in bundle) continue;
        bundle[chunk.fileName] = chunk;
      }
    },
  };
}

function getWorkerRequest(id: string): {
  workerId: string;
  wrapper: WorkerWrapper;
} {
  const [workerId, searchString] = id.split('?');
  const searchParams = new URLSearchParams(searchString);
  const wrapperModule = searchParams.get('module')!;
  const wrapperFunction = searchParams.get('function')!;

  return {
    workerId: workerId!,
    wrapper: {module: wrapperModule, function: wrapperFunction},
  };
}

const workerFunctionContent = (pkg: string) =>
  new Map([
    ['createWorker', `import ${JSON.stringify(MAGIC_MODULE_WORKER)};`],
    [
      'createThreadWorker',
      stripIndent`
        import {createThread, targetFromWebWorker} from ${JSON.stringify(pkg)};
        import * as expose from ${JSON.stringify(MAGIC_MODULE_WORKER)};

        createThread(targetFromWebWorker(self), {expose});
      `,
    ],
  ]);

const KNOWN_WRAPPER_MODULES = new Map<string, Map<string, string>>([
  ['@quilted/workers', workerFunctionContent('@quilted/workers')],
  ['@quilted/react-workers', workerFunctionContent('@quilted/react-workers')],
  ['@quilted/quilt/threads', workerFunctionContent('@quilted/quilt/threads')],
]);

function defaultContentForWorker({wrapper}: WorkerContext) {
  const content = KNOWN_WRAPPER_MODULES.get(wrapper.module)?.get(
    wrapper.function,
  );

  if (content == null) {
    throw new Error(`Unknown worker wrapper: ${JSON.stringify(wrapper)}`);
  }

  return content;
}

function defaultPlugins(mainBuildPlugins: Plugin[]) {
  return mainBuildPlugins.filter((plugin) => plugin.name !== 'serve');
}
