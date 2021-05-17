/* eslint-disable react/function-component-definition */

import {URLSearchParams} from 'url';

import {rollup} from 'rollup';
import type {Plugin, InputOptions, OutputChunk} from 'rollup';

import type {WorkerWrapper} from './types';
import {PREFIX, MAGIC_MODULE_WORKER} from './constants';
import {wrapperToSearchParams} from './utilities';

const ENTRY_PREFIX = 'quilt-worker-entry:';

export interface WorkerContentContext {
  module: string;
}

export interface Options {
  includePlugin?(plugin: Plugin): boolean;
  contentForWorker?(
    wrapper: WorkerWrapper,
    context: WorkerContentContext,
  ): string | Promise<string>;
}

export function workers({
  contentForWorker = defaultContentForWorker,
  includePlugin = defaultIncludePlugin,
}: Options = {}): Plugin {
  let inputOptions: InputOptions;
  const workerMap = new Map<string, OutputChunk>();

  return {
    name: '@quilted/workers',
    options(options) {
      inputOptions = {
        ...options,
        plugins: options.plugins?.filter(includePlugin),
      };

      return null;
    },
    async resolveId(source, importer) {
      if (!source.startsWith(PREFIX)) return null;

      const {workerId, wrapper} = getWorkerRequest(source.replace(PREFIX, ''));
      const resolvedWorker = await this.resolve(workerId, importer, {
        skipSelf: true,
      });

      if (resolvedWorker == null) return null;

      return `${PREFIX}${resolvedWorker}${wrapperToSearchParams(
        wrapper,
      ).toString()}`;
    },
    async load(id) {
      if (!id.startsWith(PREFIX)) return null;

      const {workerId, wrapper} = getWorkerRequest(id);
      // return contentForWorker(wrapper, {module: workerId});

      const bundle = await rollup({
        ...inputOptions,
        plugins: [
          {
            name: '@quilted/workers/magic-modules',
            resolveId(source) {
              if (source.startsWith(ENTRY_PREFIX)) return source;

              if (source === MAGIC_MODULE_WORKER) {
                return {id: workerId, moduleSideEffects: 'no-treeshake'};
              }

              return null;
            },
            load(id) {
              if (!id.startsWith(ENTRY_PREFIX)) return null;

              const {workerId, wrapper} = getWorkerRequest(
                id.replace(ENTRY_PREFIX, ''),
              );

              return contentForWorker(wrapper, {module: workerId});
            },
          },
          ...(inputOptions.plugins ?? []),
        ],
        input: `${ENTRY_PREFIX}${workerId}${wrapperToSearchParams(
          wrapper,
        ).toString()}`,
      });

      const result = await bundle.generate({
        format: 'iife',
        inlineDynamicImports: true,
      });

      const firstChunk = result.output.find(
        (output): output is OutputChunk => output.type === 'asset',
      );

      if (firstChunk == null) {
        workerMap.delete(workerId);
        return null;
      }

      workerMap.set(workerId, firstChunk);

      for (const module of Object.keys(firstChunk.modules)) {
        this.addWatchFile(module);
      }
    },
    generateBundle(_, bundle) {
      for (const [workerId, chunk] of workerMap) {
        if (workerId in bundle) continue;
        bundle[workerId] = chunk;
      }
    },
  };
}

function getWorkerRequest(
  id: string,
): {workerId: string; wrapper: WorkerWrapper} {
  const [workerId, searchString] = id.split('?');
  const searchParams = new URLSearchParams(searchString);
  const wrapperModule = searchParams.get('module')!;
  const wrapperFunction = searchParams.get('function')!;

  return {
    workerId,
    wrapper: {module: wrapperModule, function: wrapperFunction},
  };
}

const KNOWN_WRAPPER_MODULES = new Map<string, Map<string, string>>([
  [
    '@quilted/workers',
    new Map([
      ['createWorker', `import '@quilted/workers/worker-wrapper-basic';`],
      [
        'createCallableWorker',
        `import '@quilted/workers/worker-wrapper-callable';`,
      ],
    ]),
  ],
]);

KNOWN_WRAPPER_MODULES.set(
  '@quilted/quilt',
  KNOWN_WRAPPER_MODULES.get('@quilted/workers')!,
);

function defaultContentForWorker(wrapper: WorkerWrapper) {
  const content = KNOWN_WRAPPER_MODULES.get(wrapper.module)?.get(
    wrapper.function,
  );

  if (content == null) {
    throw new Error(`Unknown worker wrapper: ${JSON.stringify(wrapper)}`);
  }

  return content;
}

function defaultIncludePlugin(plugin: Plugin) {
  return plugin.name !== 'serve';
}
