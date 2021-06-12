import {posix, resolve} from 'path';

import type {OutputChunk, Plugin} from 'rollup';
import MagicString from 'magic-string';
import {parse as parseImports} from 'es-module-lexer';

import {createProjectPlugin} from '@quilted/sewing-kit';
import type {App} from '@quilted/sewing-kit';
import type {} from '@quilted/sewing-kit-rollup';

export function appAssets({assetBaseUrl}: {assetBaseUrl?: string} = {}) {
  return createProjectPlugin<App>({
    name: 'Quilt.AppAssets',
    build({project, configure}) {
      configure(({rollupPlugins}, {quiltBrowserEntry}) => {
        if (!quiltBrowserEntry) return;
        rollupPlugins?.(async (plugins) => {
          const {default: replace} = await import('@rollup/plugin-replace');

          if (assetBaseUrl) {
            plugins.push(
              replace({
                preventAssignment: true,
                values: {
                  __QUILT_ASSETS_BASE_URL__: JSON.stringify(assetBaseUrl),
                },
              }),
            );
          }

          plugins.push(
            preloadAsyncDependenciesRollupPlugin(project),
            assetManifestRollupPlugin(),
          );

          return plugins;
        });
      });
    },
  });
}

function assetManifestRollupPlugin(): Plugin {
  return {
    name: '@quilt/asset-manifest',
    generateBundle(_, bundle) {
      for (const chunk of Object.values(bundle)) {
        if (chunk.type !== 'chunk') continue;
        if (chunk.dynamicImports.length === 0) continue;

        const {code} = chunk;

        const newCode = new MagicString(code);

        const imports = parseImports(code)[0];

        for (const imported of imports) {
          const {s: start, e: end, d: dynamicStart} = imported;

          // es-module-lexer only sets `d >= 0` when the import is a dynamic one
          if (dynamicStart < 0) continue;

          // Get rid of the quotes
          const url = code.slice(start + 1, end - 1);

          const originalFilename = chunk.fileName;
          const additionalDependencies = new Set<string>();
          const analyzed = new Set<string>();

          const normalizedFile = posix.join(
            posix.dirname(originalFilename),
            url,
          );

          const addDependencies = (filename: string) => {
            if (filename === originalFilename) return;
            if (analyzed.has(filename)) return;

            analyzed.add(filename);
            const chunk = bundle[filename];

            if (chunk == null) return;

            additionalDependencies.add(chunk.fileName);

            if (chunk.type !== 'chunk') return;

            for (const imported of chunk.imports) {
              addDependencies(imported);
            }
          };

          addDependencies(normalizedFile);

          if (additionalDependencies.size === 1) continue;

          const originalImport = code.slice(dynamicStart, end + 1);
          newCode.overwrite(
            dynamicStart,
            end + 1,
            `Quilt.AsyncAssets.preload(${Array.from(additionalDependencies)
              .map((dependency) => JSON.stringify(dependency))
              .join(',')}).then(function(){return ${originalImport}})`,
          );
        }

        chunk.code = newCode.toString();
      }
    },
  };
}

interface ManifestAsset {
  source: string;
}

interface Manifest {
  format: 'esmodules' | 'systemjs';
  match: Record<string, string>;
  entry: ManifestAsset[];
  asyncAssets: Record<string, ManifestAsset[]>;
}

function preloadAsyncDependenciesRollupPlugin(app: App): Plugin {
  return {
    name: '@quilt/preload-async-assets',
    async generateBundle({format, dir}, bundle) {
      const manifest: Partial<Manifest> = {
        format: format === 'es' ? 'esmodules' : 'systemjs',
        match: {},
        asyncAssets: {},
      };

      const outputs = Object.values(bundle);

      const entries = outputs.filter(
        (output): output is OutputChunk =>
          output.type === 'chunk' && output.isEntry,
      );

      if (entries.length !== 1) {
        throw new Error(
          `Can only generate an asset manifest for a single-entry build, but found ${entries.length} entries instead.`,
        );
      }

      const entryChunk = entries[0];

      manifest.entry = [
        {source: entryChunk.fileName},
        ...entryChunk.imports.map((imported) => ({source: imported})),
      ];

      const entryAssets = new Set(manifest.entry!.map(({source}) => source));

      for (const output of outputs) {
        if (output.type !== 'chunk' || output.facadeModuleId == null) continue;
        if (!output.facadeModuleId.startsWith('quilt-async-entry:')) continue;

        // This metadata is added by the rollup plugin for @quilted/async
        const asyncId = this.getModuleInfo(output.facadeModuleId)?.meta.quilt
          ?.asyncId;

        manifest.asyncAssets![asyncId] = [
          {source: output.fileName},
          ...output.imports.flatMap((imported) =>
            entryAssets.has(imported) ? [] : {source: imported},
          ),
        ];
      }

      await app.fs.write(
        resolve(dir!, '../manifests/manifest.json'),
        JSON.stringify(manifest, null, 2),
      );
    },
  };
}
