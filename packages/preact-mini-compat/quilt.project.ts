import {createProject, quiltPackage, createProjectPlugin} from '@quilted/craft';
import type {MangleOptions} from 'terser';

export default createProject((pkg) => {
  pkg.entry({source: './source/index'});
  pkg.use(
    quiltPackage(),
    // @see https://github.com/preactjs/preact/blob/master/mangle.json
    terser({
      nameCache: 'config/terser/name-cache.json',
      mangle: {
        properties: {
          regex: '^_[^_]',
          reserved: [
            '__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED',
            '__REACT_DEVTOOLS_GLOBAL_HOOK__',
            '__PREACT_DEVTOOLS__',
            '_renderers',
            '__source',
            '__self',
          ],
        },
      },
    }),
  );
});

function terser({
  mangle = true,
  nameCache: nameCacheFile,
}: {nameCache?: string; mangle?: MangleOptions | boolean} = {}) {
  return createProjectPlugin({
    name: 'QuiltInternal.Terser',
    build({run, project}) {
      run((step) =>
        step({
          name: 'QuiltInternal.Terser',
          label: `Running terser on ${project.name}`,
          async run() {
            const [{minify}, {default: limit}] = await Promise.all([
              import('terser'),
              import('p-limit'),
            ]);

            const files = await project.fs.glob(
              project.fs.buildPath('**/*.{esnext,mjs}'),
            );
            const run = limit(10);

            const nameCache = nameCacheFile
              ? (async () => {
                  try {
                    JSON.parse(
                      await project.fs.read(
                        project.fs.resolvePath(nameCacheFile),
                      ),
                    );
                  } catch {
                    return {};
                  }
                })()
              : {};

            await Promise.all(
              files.map((file) =>
                run(async () => {
                  const content = await project.fs.read(file);
                  const result = await minify(content, {
                    mangle,
                    compress: false,
                    ecma: 2017,
                    toplevel: true,
                    module: true,
                    nameCache,
                  });

                  await project.fs.write(file, result.code!);
                }),
              ),
            );
          },
        }),
      );
    },
  });
}
