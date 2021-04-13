import {createProjectPlugin, Service} from '@sewing-kit/plugins';

import type {} from './http-handler';
import {excludeNonPolyfillEntries} from './shared';
import {MAGIC_MODULE_HTTP_HANDLER} from './constants';

interface Options {
  readonly port?: number;
  readonly host?: string;
}

export function serviceAutoServer({
  host: defaultHost,
  port: defaultPort,
}: Options = {}) {
  return createProjectPlugin<Service>(
    'Quilt.ServiceAutoServer',
    ({project, tasks, api}) => {
      tasks.dev.hook(({hooks}) => {
        hooks.configure.hook(({quiltHttpHandlerHost, quiltHttpHandlerPort}) => {
          if (defaultHost) quiltHttpHandlerHost!.hook(() => defaultHost);
          if (defaultPort) quiltHttpHandlerPort!.hook(() => defaultPort);
        });
      });

      tasks.build.hook(({hooks}) => {
        hooks.target.hook(({hooks}) => {
          hooks.configure.hook((configuration) => {
            if (defaultHost) {
              configuration.quiltHttpHandlerHost!.hook(() => defaultHost);
            }

            if (defaultPort) {
              configuration.quiltHttpHandlerPort!.hook(() => defaultPort);
            }

            const entryPath = api.tmpPath(`quilt/${project.name}-entry.js`);
            const httpHandlerPath = api.tmpPath(
              `quilt/${project.name}-http-handler.js`,
            );

            configuration.webpackEntries?.hook((entries) => [
              ...excludeNonPolyfillEntries(entries),
              entryPath,
            ]);

            configuration.webpackAliases?.hook((aliases) => ({
              ...aliases,
              [MAGIC_MODULE_HTTP_HANDLER]: httpHandlerPath,
            }));

            configuration.webpackPlugins?.hook(async (plugins) => {
              const {default: WebpackVirtualModules} = await import(
                'webpack-virtual-modules'
              );

              const entrySource = await configuration.quiltHttpHandlerContent?.run(
                undefined,
              );

              if (!entrySource) {
                throw new Error(
                  `Could not create auto-server entry for project ${project.name}`,
                );
              }

              return [
                ...plugins,
                new WebpackVirtualModules({
                  [httpHandlerPath]: `export {default} from ${JSON.stringify(
                    project.fs.resolvePath(project.entry ?? 'index'),
                  )};`,
                  [entryPath]: entrySource,
                }),
              ];
            });
          });
        });
      });
    },
  );
}
