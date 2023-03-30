import {dirname} from 'path';
import {mkdir, writeFile} from 'fs/promises';

import type {
  Plugin,
  PluginContext,
  OutputChunk,
  OutputBundle,
  NormalizedOutputOptions,
} from 'rollup';

import type {
  AssetsBuildManifest,
  AssetsBuildManifestEntry,
} from './manifest.ts';

export interface Options {
  id?: string;
  path: string;
  baseUrl: string;
  priority?: number;
  cacheKey?: Record<string, any>;
}

export function assetManifest(manifestOptions: Options): Plugin {
  return {
    name: '@quilted/assets/manifest',
    async generateBundle(options, bundle) {
      await writeManifestForBundle.call(this, bundle, manifestOptions, options);
    },
  };
}

async function writeManifestForBundle(
  this: PluginContext,
  bundle: OutputBundle,
  {id, path, baseUrl, cacheKey, priority}: Options,
  {format}: NormalizedOutputOptions,
) {
  const outputs = Object.values(bundle);

  const entries = outputs.filter(
    (output): output is OutputChunk =>
      output.type === 'chunk' && output.isEntry,
  );

  if (entries.length === 0) {
    throw new Error(`Could not find any entries in your rollup bundle...`);
  }

  // We assume the first entry is the "main" one. There can be
  // more than one because each worker script is also listed as an
  // entry (though, from a separate build).
  const entryChunk = entries[0]!;

  const dependencyMap = new Map<string, string[]>();

  for (const output of outputs) {
    if (output.type !== 'chunk') continue;
    dependencyMap.set(output.fileName, output.imports);
  }

  const assets: string[] = [];
  const assetIdMap = new Map<string, number>();

  function getAssetId(file: string) {
    let id = assetIdMap.get(file);

    if (id == null) {
      assets.push(`${baseUrl}${file}`);
      id = assets.length - 1;
      assetIdMap.set(file, id);
    }

    return id;
  }

  const manifest: AssetsBuildManifest<any> = {
    id,
    priority,
    cacheKey,
    assets,
    attributes: format === 'es' ? {scripts: {type: 'module'}} : undefined,
    entries: {
      default: createAssetsEntry([...entryChunk.imports, entryChunk.fileName], {
        dependencyMap,
        getAssetId,
      }),
    },
    modules: {},
  };

  for (const output of outputs) {
    if (output.type !== 'chunk') continue;

    const originalModuleId =
      output.facadeModuleId ?? output.moduleIds[output.moduleIds.length - 1];

    if (originalModuleId == null) continue;

    // This metadata is added by the rollup plugin for @quilted/async
    const moduleId = this.getModuleInfo(originalModuleId)?.meta.quilt?.moduleId;

    if (moduleId == null) continue;

    manifest.modules[moduleId] = createAssetsEntry(
      [...output.imports, output.fileName],
      {dependencyMap, getAssetId},
    );
  }

  await mkdir(dirname(path), {recursive: true});
  await writeFile(path, JSON.stringify(manifest, null, 2));
}

function createAssetsEntry(
  files: string[],
  {
    dependencyMap,
    getAssetId,
  }: {
    dependencyMap: Map<string, string[]>;
    getAssetId(file: string): number;
  },
): AssetsBuildManifestEntry {
  const styles: number[] = [];
  const scripts: number[] = [];

  const allFiles = new Set<string>();
  const addFile = (file: string) => {
    if (allFiles.has(file)) return;
    allFiles.add(file);

    for (const dependency of dependencyMap.get(file) ?? []) {
      addFile(dependency);
    }
  };

  for (const file of files) {
    addFile(file);
  }

  for (const file of allFiles) {
    if (file.endsWith('.css')) {
      styles.push(getAssetId(file));
    } else {
      scripts.push(getAssetId(file));
    }
  }

  return {scripts, styles};
}
