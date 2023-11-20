import {posix} from 'path';
import {URLSearchParams} from 'url';

import {rollup} from 'rollup';
import type {
  Plugin,
  InputOptions,
  OutputOptions,
  OutputChunk,
  NormalizedInputOptions,
} from 'rollup';

import {multiline} from '../shared/strings.ts';

const PREFIX = '\0quilt-worker:';
const ENTRY_PREFIX = '\0quilt-worker-entry:';
const MAGIC_MODULE_WORKER = 'quilt:module/worker.js';

export interface WorkerWrapper {
  readonly module: string;
  readonly function: string;
}

export interface WorkerContext {
  readonly module: string;
  readonly wrapper: WorkerWrapper;
}

export interface BaseURLContext extends WorkerContext {
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
   * option). You can then use the `baseURL()` option to control the URL that is
   * generated for each worker module such that the tool is able to route that request
   * to the written file. For example, in Vite, you can use the special `/@fs` prefix
   * for a URL:
   *
   * ```ts
   * import * as path from 'path';
   *
   * workers({
   *   write: true,
   *   baseURL({outputOptions}) {
   *     return `/@fs${path.resolve(outputOptions.dir)}`;
   *   },
   * })
   * ```
   */
  write?: ValueOrGetter<boolean>;
  plugins?: ValueOrUpdateGetter<Plugin[]>;
  inputOptions?: ValueOrUpdateGetter<InputOptions>;
  outputOptions?: ValueOrUpdateGetter<OutputOptions>;
  baseURL?: ValueOrGetter<string | undefined, BaseURLContext>;
}

export function workers({
  write = false,
  baseURL,
  plugins = defaultPlugins,
  inputOptions = {},
  outputOptions = {},
}: Options = {}): Plugin {
  let parentInputOptions: NormalizedInputOptions;
  const workerMap = new Map<string, OutputChunk>();

  return {
    name: '@quilted/workers',
    buildStart(inputOptions) {
      parentInputOptions = inputOptions;
    },
    async resolveId(source, importer) {
      const context = parseWorkerImport(source);

      if (context == null) return null;

      const resolvedModule = await this.resolve(context.module, importer, {
        skipSelf: true,
      });

      if (resolvedModule == null) return null;

      return serializeWorkerImport({...context, module: resolvedModule.id});
    },
    async load(id) {
      const context = parseWorkerImport(id);

      if (context == null) return null;

      const {module} = context;

      const workerPlugins: Plugin[] = [
        workerMagicModules(),
        ...(typeof plugins === 'function'
          ? await plugins(
              [
                ...(parentInputOptions.plugins?.filter(
                  (plugin): plugin is Plugin => Boolean(plugin),
                ) ?? []),
              ],
              context,
            )
          : plugins),
      ];

      const baseInputOptions: InputOptions = {
        ...parentInputOptions,
        input: serializeWorkerImport(context, ENTRY_PREFIX),
        plugins: workerPlugins,
      };

      const workerInputOptions =
        typeof inputOptions === 'function'
          ? await inputOptions(baseInputOptions, context)
          : baseInputOptions;

      const baseOutputOptions: OutputOptions = {
        format: 'iife',
        inlineDynamicImports: true,
        dir: 'workers',
        entryFileNames: `[name].[hash].js`,
        assetFileNames: `[name].[hash].[ext]`,
        chunkFileNames: `[name].[hash].js`,
      };

      const workerOutputOptions =
        typeof outputOptions === 'function'
          ? await outputOptions(baseOutputOptions, context)
          : {...baseOutputOptions, ...outputOptions};

      const shouldWrite =
        typeof write === 'function' ? await write(context) : write;

      const bundle = await rollup(workerInputOptions);

      const result = await (shouldWrite
        ? bundle.write(workerOutputOptions)
        : bundle.generate(workerOutputOptions));

      const firstChunk = result.output.find(
        (output): output is OutputChunk => output.type === 'chunk',
      );

      if (firstChunk == null) {
        workerMap.delete(module);
        return null;
      }

      workerMap.set(module, firstChunk);

      for (const module of Object.keys(firstChunk.modules)) {
        this.addWatchFile(module);
      }

      const filename = firstChunk.fileName;
      let resolvedBaseURL = filename;

      if (typeof baseURL === 'string') {
        resolvedBaseURL = posix.join(baseURL, filename);
      } else if (typeof baseURL === 'function') {
        const returnedBaseURL = await baseURL({
          ...context,
          filename,
          chunk: firstChunk,
          outputOptions: workerOutputOptions,
        });

        if (returnedBaseURL) {
          resolvedBaseURL = posix.join(returnedBaseURL, filename);
        }
      }

      return `export default ${JSON.stringify(resolvedBaseURL)};`;
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

export function workerMagicModules() {
  return {
    name: '@quilted/workers/magic-modules',
    resolveId(source) {
      if (source.startsWith(ENTRY_PREFIX)) {
        return {id: source};
      }

      return null;
    },
    async load(id) {
      const context = parseWorkerImport(id, ENTRY_PREFIX);

      if (context == null) return null;

      return contentForWorker(context);
    },
  } satisfies Plugin;
}

export function parseWorkerImport(
  id: string,
  prefix = PREFIX,
): WorkerContext | undefined {
  if (!id.startsWith(prefix)) return undefined;

  const [module, searchString] = id.slice(prefix.length).split('?');
  const searchParams = new URLSearchParams(searchString);
  const wrapperModule = searchParams.get('module')!;
  const wrapperFunction = searchParams.get('function')!;

  return {
    module: module!,
    wrapper: {module: wrapperModule, function: wrapperFunction},
  };
}

export function serializeWorkerImport(
  {module, wrapper}: WorkerContext,
  prefix = PREFIX,
) {
  return `${prefix}${module}${wrapperToSearchString(wrapper)}`;
}

const workerFunctionContent = (pkg: string) =>
  new Map([
    ['createWorker', `import ${JSON.stringify(MAGIC_MODULE_WORKER)};`],
    [
      'createThreadWorker',
      multiline`
        import {createThreadFromWebWorker} from ${JSON.stringify(pkg)};
        import * as expose from ${JSON.stringify(MAGIC_MODULE_WORKER)};

        createThreadFromWebWorker(self, {expose});
      `,
    ],
  ]);

const KNOWN_WRAPPER_MODULES = new Map<string, Map<string, string>>([
  ['@quilted/workers', workerFunctionContent('@quilted/workers')],
  ['@quilted/react-workers', workerFunctionContent('@quilted/react-workers')],
  ['@quilted/quilt/threads', workerFunctionContent('@quilted/quilt/threads')],
]);

function contentForWorker({module, wrapper}: WorkerContext) {
  const content = KNOWN_WRAPPER_MODULES.get(wrapper.module)?.get(
    wrapper.function,
  );

  if (content == null) {
    throw new Error(`Unknown worker wrapper: ${JSON.stringify(wrapper)}`);
  }

  return content.replace(MAGIC_MODULE_WORKER, module);
}

function defaultPlugins(mainBuildPlugins: Plugin[]) {
  return mainBuildPlugins.filter((plugin) => plugin.name !== 'serve');
}

function wrapperToSearchString(wrapper: WorkerWrapper) {
  return `?${new URLSearchParams(Object.entries(wrapper)).toString()}`;
}
