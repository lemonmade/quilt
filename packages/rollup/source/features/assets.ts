import * as path from 'path';
import {readFileSync} from 'fs';
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

import type {
  AssetsBuildManifest,
  AssetsBuildManifestEntry,
  AssetBuildManifestAsset,
} from '@quilted/assets';

export interface AssetManifestOptions {
  file: string;
  baseURL: string;
  priority?: number;
  cacheKey?: URLSearchParams;
}

export function assetManifest(manifestOptions: AssetManifestOptions): Plugin {
  return {
    name: '@quilted/asset-manifest',
    async writeBundle(options, bundle) {
      await writeManifestForBundle.call(this, bundle, manifestOptions, options);
    },
  };
}

async function writeManifestForBundle(
  this: PluginContext,
  bundle: OutputBundle,
  {file, baseURL, cacheKey, priority}: AssetManifestOptions,
  {format, dir = process.cwd()}: NormalizedOutputOptions,
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

  const scripts: AssetBuildManifestAsset[] = [];
  const styles: AssetBuildManifestAsset[] = [];
  const scriptsIdMap = new Map<string, number>();
  const stylesIdMap = new Map<string, number>();

  function createAsset(file: string) {
    const contents = readFileSync(path.join(dir, file));
    return {
      file,
      integrity: `sha256-${createHash('sha256')
        .update(contents)
        .digest('base64')}`,
    };
  }

  function getAssetId(file: string) {
    let id: number;

    if (file.endsWith('.css')) {
      id = stylesIdMap.get(file)!;

      if (id == null) {
        styles.push(createAsset(file));
        id = styles.length - 1;
        stylesIdMap.set(file, id);
      }
    } else {
      id = scriptsIdMap.get(file)!;

      if (id == null) {
        scripts.push(createAsset(file));
        id = scripts.length - 1;
        scriptsIdMap.set(file, id);
      }
    }

    return id;
  }

  const manifest: AssetsBuildManifest = {
    version: '0.1',
    priority,
    cacheKey: cacheKey && cacheKey.size > 0 ? cacheKey.toString() : undefined,
    baseURL,
    styles: {
      assets: styles,
    },
    scripts: {
      assets: scripts,
      attributes: format === 'es' ? {type: 'module'} : undefined,
    },
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
    const moduleId = this.getModuleInfo(originalModuleId)?.meta.quilt?.moduleID;

    if (moduleId == null) continue;

    manifest.modules[moduleId] = createAssetsEntry(
      [...output.imports, output.fileName],
      {dependencyMap, getAssetId},
    );
  }

  await fs.mkdir(path.dirname(file), {recursive: true});
  await fs.writeFile(file, JSON.stringify(manifest, null, 2));
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
