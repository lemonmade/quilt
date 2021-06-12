import {posix, dirname} from 'path';
import {mkdir, writeFile} from 'fs/promises';
import {URLSearchParams} from 'url';

import type {
  Plugin,
  PluginContext,
  OutputChunk,
  OutputBundle,
  NormalizedOutputOptions,
} from 'rollup';
import {stripIndent} from 'common-tags';
import MagicString from 'magic-string';
import {parse as parseImports} from 'es-module-lexer';

import {PREFIX} from './constants';
import type {Manifest, ManifestEntry, Asset} from './assets';

const ENTRY_PREFIX = 'quilt-async-entry:';

export interface Options {
  preload?: boolean;
  manifest?: string | false;
  assetBaseUrl?: string;
}

export function asyncQuilt({
  preload = true,
  manifest = false,
  assetBaseUrl = '/assets/',
}: Options = {}): Plugin {
  return {
    name: '@quilted/async',
    async resolveDynamicImport(source, importer) {
      if (typeof source !== 'string') return null;

      const {asyncId, moduleId} = getAsyncRequest(source.replace(PREFIX, ''));
      const resolvedWorker = await this.resolve(moduleId, importer, {
        skipSelf: true,
      });

      if (resolvedWorker == null) return null;

      return `${ENTRY_PREFIX}${resolvedWorker.id}?id=${asyncId}`;
    },
    load(id: string) {
      if (!id.startsWith(ENTRY_PREFIX)) return;

      const {asyncId, moduleId} = getAsyncRequest(id.replace(ENTRY_PREFIX, ''));

      let code = stripIndent`
        import * as AsyncModule from ${JSON.stringify(moduleId)};
        export {default} from ${JSON.stringify(moduleId)};
        export * from ${JSON.stringify(moduleId)};
      `;

      if (preload) {
        code += `\nQuilt.AsyncAssets.set(${JSON.stringify(
          asyncId,
        )}, AsyncModule);`;
      }

      return {
        code,
        meta: {
          quilt: {asyncId},
        },
      };
    },
    transform: assetBaseUrl
      ? (code) =>
          code.replace(
            /__QUILT_ASSETS_BASE_URL__/g,
            JSON.stringify(assetBaseUrl),
          )
      : undefined,
    async generateBundle(options, bundle) {
      if (preload) {
        preloadAsyncAssetsInBundle(bundle);
      }

      if (manifest) {
        await writeManifestForBundle.call(this, manifest, bundle, {
          ...options,
          assetBaseUrl,
        });
      }
    },
  };
}

function preloadAsyncAssetsInBundle(bundle: OutputBundle) {
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

      const normalizedFile = posix.join(posix.dirname(originalFilename), url);

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
}

async function writeManifestForBundle(
  this: PluginContext,
  manifestFile: string,
  bundle: OutputBundle,
  {format, assetBaseUrl}: NormalizedOutputOptions & {assetBaseUrl: string},
) {
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

  const manifest: Partial<Manifest> = {
    format: format === 'es' ? 'esm' : 'systemjs',
    match: [],
    entry: createAsset(assetBaseUrl, [
      entryChunk.fileName,
      ...entryChunk.imports,
    ]),
    async: {},
  };

  const entryAssets = new Set([
    ...manifest.entry!.styles.map(({source}) => source),
    ...manifest.entry!.scripts.map(({source}) => source),
  ]);

  for (const output of outputs) {
    if (output.type !== 'chunk' || output.facadeModuleId == null) continue;
    if (!output.facadeModuleId.startsWith(ENTRY_PREFIX)) continue;

    // This metadata is added by the rollup plugin for @quilted/async
    const asyncId = this.getModuleInfo(output.facadeModuleId)?.meta.quilt
      ?.asyncId;

    manifest.async![asyncId] = createAsset(assetBaseUrl, [
      output.fileName,
      ...output.imports.filter((imported) => !entryAssets.has(imported)),
    ]);
  }

  await mkdir(dirname(manifestFile), {recursive: true});
  await writeFile(manifestFile, JSON.stringify(manifest, null, 2));
}

function createAsset(baseUrl: string, files: string[]): ManifestEntry {
  const styles: Asset[] = [];
  const scripts: Asset[] = [];

  for (const file of files) {
    if (file.endsWith('.css')) {
      styles.push({source: `${baseUrl}${file}`});
    } else {
      scripts.push({source: `${baseUrl}${file}`});
    }
  }

  return {scripts, styles};
}

function getAsyncRequest(id: string): {
  asyncId: string;
  moduleId: string;
} {
  const [moduleId, searchString] = id.split('?');
  const searchParams = new URLSearchParams(searchString);
  const asyncId = searchParams.get('id')!;

  return {
    asyncId,
    moduleId,
  };
}
