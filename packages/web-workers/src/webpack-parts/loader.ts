import * as path from 'path';
import {getOptions} from 'loader-utils';

// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
// @ts-ignore
import SingleEntryPlugin from 'webpack/lib/SingleEntryPlugin';

// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
// @ts-ignore
import WebWorkerTemplatePlugin from 'webpack/lib/webworker/WebWorkerTemplatePlugin';

// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
// @ts-ignore
import FetchCompileWasmTemplatePlugin from 'webpack/lib/web/FetchCompileWasmTemplatePlugin';

import {Runner} from '../types';
import {WebWorkerPlugin} from './plugin';

const NAME = 'WebWorker';

export interface Options {
  name?: string;
  runner?: Runner;
}

export function pitch(
  this: import('webpack').loader.LoaderContext,
  request: string,
) {
  this.cacheable(false);
  const callback = this.async();

  const {
    context,
    resourcePath,
    _compiler: compiler,
    _compilation: compilation,
  } = this;

  if (compiler.options.output!.globalObject !== 'self') {
    return callback!(
      new Error(
        'webpackConfig.output.globalObject is not set to "self", which will cause chunk loading in the worker to fail. Please change the value to "self" for any builds targeting the browser, or set the {noop: true} option on the @quilted/web-workers babel plugin.',
      ),
    );
  }

  const plugin: WebWorkerPlugin = (compiler.options.plugins || []).find(
    WebWorkerPlugin.isInstance,
  ) as any;

  if (plugin == null) {
    throw new Error(
      'You must also include the WebWorkerPlugin from `@quilted/web-workers` when using the Babel plugin.',
    );
  }

  const options: Options = getOptions(this) || {};
  const {name = String(plugin.workerId++), runner = Runner.Expose} = options;

  const virtualModule = path.join(
    path.dirname(resourcePath),
    `${path.basename(resourcePath, path.extname(resourcePath))}.worker.js`,
  );

  if (runner === Runner.Expose) {
    plugin.virtualModules.writeModule(
      virtualModule,
      `
        import * as api from ${JSON.stringify(request)};
        import {expose} from '@quilted/web-workers/worker';

        expose(api);
      `,
    );
  } else if (runner === Runner.React) {
    plugin.virtualModules.writeModule(
      virtualModule,
      `
        import {createElement, Component} from 'react';
        import {createRemoteRoot} from '@remote-ui/core';
        import {render} from '@remote-ui/react';
        import {retain} from '@quilted/web-workers';
        import {expose} from '@quilted/web-workers/worker';
        import WorkerComponent from ${JSON.stringify(request)};

        class Runner extends Component {
          constructor(props) {
            super(props);
            this.state = Object.assign({}, props);
          }

          updateProps(update) {
            this.setState(update);
          }

          render() {
            return createElement(WorkerComponent, this.state);
          }
        }

        function mount(props, dispatch) {
          let runner;

          retain(props);
          retain(dispatch);

          const root = createRemoteRoot(dispatch, {});

          render(
            createElement(Runner, {
              ref: (createdRunner) => {
                runner = createdRunner;
              }
            }),
            root
          );

          return (update) => {
            retain(update);
            runner.updateProps(update);
          };
        }

        expose({mount});
      `,
    );
  }

  const workerOptions = {
    filename: addWorkerSubExtension(
      compiler.options.output!.filename as string,
    ),
    chunkFilename: addWorkerSubExtension(
      compiler.options.output!.chunkFilename!,
    ),
    globalObject: (plugin && plugin.options.globalObject) || 'self',
  };

  const workerCompiler: import('webpack').Compiler = compilation.createChildCompiler(
    NAME,
    workerOptions,
    [],
  );

  (workerCompiler as any).context = (compiler as any).context;

  new WebWorkerTemplatePlugin({}).apply(workerCompiler);
  new FetchCompileWasmTemplatePlugin({
    mangleImports: (compiler.options.optimization! as any).mangleWasmImports,
  }).apply(workerCompiler);
  new SingleEntryPlugin(
    context,
    runner === Runner.None ? request : virtualModule,
    name,
  ).apply(workerCompiler);

  for (const aPlugin of plugin.options.plugins || []) {
    aPlugin.apply(workerCompiler);
  }

  const subCache = `subcache ${__dirname} ${request}`;
  workerCompiler.hooks.compilation.tap(NAME, (compilation) => {
    if (!compilation.cache) {
      return;
    }

    if (!compilation.cache[subCache]) {
      compilation.cache[subCache] = {};
    }

    compilation.cache = compilation.cache[subCache];
  });

  (workerCompiler as any).runAsChild(
    (
      error: Error | null,
      entries: {files: string[]}[] | null,
      compilation: import('webpack').compilation.Compilation,
    ) => {
      let finalError;

      if (!error && compilation.errors && compilation.errors.length) {
        finalError = compilation.errors[0];
      }
      const entry = entries && entries[0] && entries[0].files[0];

      if (!finalError && !entry) {
        finalError = new Error(`WorkerPlugin: no entry for ${request}`);
      }

      if (finalError) {
        return callback!(finalError);
      }

      return callback!(
        null,
        `export default __webpack_public_path__ + ${JSON.stringify(entry)};`,
      );
    },
  );
}

function addWorkerSubExtension(file: string) {
  return file.replace(/\.([a-z]+)$/i, '.worker.$1');
}

const loader = {
  pitch,
};

export default loader;
