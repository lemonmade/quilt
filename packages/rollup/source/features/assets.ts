import * as path from 'path';
import * as fs from 'fs/promises';
import {createHash} from 'crypto';

import type {
  NormalizedOutputOptions,
  OutputBundle,
  OutputChunk,
  Plugin,
  PluginContext,
} from 'rollup';
import * as mime from 'mrmime';

import type {AssetBuildManifest, AssetBuildAsset} from '@quilted/assets';

export interface AssetManifestOptions {
  file: string;
  key?: URLSearchParams;
  base: string;
  priority?: number;
  moduleID?(details: {imported: string}): string;
}

export function assetManifest(manifestOptions: AssetManifestOptions): Plugin {
  return {
    name: '@quilted/asset-manifest',
    async generateBundle(options, bundle) {
      await writeManifestForBundle.call(this, bundle, manifestOptions, options);
    },
  };
}

async function writeManifestForBundle(
  this: PluginContext,
  bundle: OutputBundle,
  {
    file,
    base,
    key,
    priority,
    moduleID: getModuleID = defaultModuleID,
  }: AssetManifestOptions,
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

  const dependencyMap = new Map<string, string[]>();

  for (const output of outputs) {
    if (output.type !== 'chunk') continue;
    dependencyMap.set(output.fileName, output.imports);
  }

  const assets: AssetBuildAsset[] = [];
  const assetIdMap = new Map<string, number>();

  function getAssetId(file: string) {
    let id = assetIdMap.get(file);

    if (id == null) {
      assets.push([file.endsWith('.css') ? 1 : 2, file]);
      id = assets.length - 1;
      assetIdMap.set(file, id);
    }

    return id;
  }

  const manifest: AssetBuildManifest = {
    key: key && key.size > 0 ? key.toString() : undefined,
    base,
    priority,
    assets,
    attributes: format === 'es' ? {2: {type: 'module'}} : undefined,
    entries: {} as any,
    modules: {},
  };

  for (const output of outputs) {
    if (
      output.type !== 'chunk' ||
      (!output.isDynamicEntry && !output.isEntry)
    ) {
      continue;
    }

    const rollupModuleID = output.facadeModuleId ?? output.moduleIds.at(-1);

    if (rollupModuleID == null) continue;
    if (rollupModuleID.startsWith('\0quilt-worker-entry:')) continue;

    const moduleInfo = this.getModuleInfo(rollupModuleID);
    const imported = moduleInfo?.meta?.quilt?.module ?? rollupModuleID;

    const moduleID = getModuleID({imported: imported});

    if (moduleID == null) continue;

    if (output.isEntry) {
      const entry = moduleInfo?.meta?.quilt?.entry ?? moduleID;
      manifest.entries[entry] = moduleID;
    }

    manifest.modules[moduleID] = createAssetsEntry(
      [...output.imports, output.fileName],
      {dependencyMap, getAssetId},
    );
  }

  await fs.mkdir(path.dirname(file), {recursive: true});
  await fs.writeFile(file, JSON.stringify(manifest, null, 2));
}

function defaultModuleID({imported}: {imported: string}) {
  return imported.startsWith('/')
    ? path.relative(process.cwd(), imported)
    : imported.startsWith('\0')
      ? imported.replace('\0', '')
      : imported;
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
) {
  const assets: number[] = [];

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
    assets.push(getAssetId(file));
  }

  return assets;
}

const QUERY_PATTERN = /\?.*$/s;
const HASH_PATTERN = /#.*$/s;
const RAW_PATTERN = /(\?|&)raw(?:&|$)/;

const DEFAULT_INLINE_LIMIT = 4096;
const DEFAULT_OUTPUT_PATTERN = '[name].[hash].[ext]';
const DEFAULT_STATIC_ASSET_EXTENSIONS = [
  // images
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.svg',
  '.ico',
  '.webp',
  '.avif',

  // media
  '.mp4',
  '.webm',
  '.ogg',
  '.mp3',
  '.wav',
  '.flac',
  '.aac',

  // fonts
  '.woff',
  '.woff2',
  '.eot',
  '.ttf',
  '.otf',

  // other
  '.webmanifest',
  '.pdf',
  '.txt',
];

export function rawAssets(): Plugin {
  return {
    name: '@quilted/raw-assets',
    async load(id) {
      if (id.startsWith('\0') || !RAW_PATTERN.test(id)) {
        return null;
      }

      const moduleId = cleanModuleIdentifier(id);

      this.addWatchFile(moduleId);

      const file = await fs.readFile(moduleId, {
        encoding: 'utf-8',
      });

      return `export default ${JSON.stringify(file)}`;
    },
  };
}

export function staticAssets({
  emit = true,
  baseURL = '/',
  extensions = DEFAULT_STATIC_ASSET_EXTENSIONS,
  inlineLimit = DEFAULT_INLINE_LIMIT,
  outputPattern = DEFAULT_OUTPUT_PATTERN,
}: {
  emit?: boolean;
  baseURL?: string;
  extensions?: readonly string[];
  inlineLimit?: number;
  outputPattern?: string;
} = {}) {
  const assetCache = new Map<string, string>();
  const assetMatcher = new RegExp(
    `\\.(` +
      extensions
        .map((extension) =>
          extension.startsWith('.') ? extension.slice(1) : extension,
        )
        .join('|') +
      `)(\\?.*)?$`,
  );

  return {
    name: '@quilted/static-assets',
    async load(id) {
      if (id.startsWith('\0') || !assetMatcher.test(id)) {
        return null;
      }

      const cached = assetCache.get(id);

      if (cached) {
        return cached;
      }

      const file = cleanModuleIdentifier(id);
      const content = await fs.readFile(file);

      let url: string;

      if (!file.endsWith('.svg') && content.length < inlineLimit) {
        // base64 inlined as a string
        url = `data:${mime.lookup(file)};base64,${content.toString('base64')}`;
      } else {
        const contentHash = getHash(content);

        const filename = assetFileNamesToFileName(
          outputPattern,
          file,
          contentHash,
        );

        url = `${
          baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL
        }/${filename}`;

        if (emit) {
          this.emitFile({
            name: file,
            type: 'asset',
            fileName: filename,
            source: content,
          });
        }
      }

      const source = `export default ${JSON.stringify(url)};`;

      assetCache.set(id, source);

      return source;
    },
  } satisfies Plugin;
}

function assetFileNamesToFileName(
  pattern: string,
  file: string,
  contentHash: string,
): string {
  const basename = path.basename(file);

  const extname = path.extname(basename);
  const ext = extname.substring(1);
  const name = basename.slice(0, -extname.length);
  const hash = contentHash;

  return pattern.replace(/\[\w+\]/g, (placeholder) => {
    switch (placeholder) {
      case '[ext]':
        return ext;

      case '[extname]':
        return extname;

      case '[hash]':
        return hash;

      case '[name]':
        return name;
    }
    throw new Error(
      `invalid placeholder ${placeholder} in assetFileNames "${pattern}"`,
    );
  });
}

function getHash(text: Buffer | string): string {
  return createHash('sha256').update(text).digest('hex').substring(0, 8);
}

function cleanModuleIdentifier(url: string) {
  return url.replace(HASH_PATTERN, '').replace(QUERY_PATTERN, '');
}
