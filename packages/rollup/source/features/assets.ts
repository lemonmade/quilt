import * as path from 'path';
import * as fs from 'fs/promises';
import {createHash} from 'crypto';

import type {
  NormalizedOutputOptions,
  OutputAsset,
  OutputBundle,
  OutputChunk,
  Plugin,
  PluginContext,
} from 'rollup';
import * as mime from 'mrmime';

import type {
  AssetBuildManifest,
  AssetBuildAsset,
  AssetBuildModuleEntry,
} from '@quilted/assets';

export interface AssetManifestOptions {
  file: string;
  key?: URLSearchParams;
  base: string;
  priority?: number;
  inline?: Set<string>;
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
    inline,
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

  // Map chunk fileName → its imports (JS chunks + CSS assets), for recursive dep walking
  const dependencyMap = new Map<string, string[]>();

  for (const output of outputs) {
    if (output.type !== 'chunk') continue;
    dependencyMap.set(output.fileName, output.imports);
  }

  // Map facadeModuleId → chunk fileName, for resolving dynamic imports
  const facadeToChunk = new Map<string, string>();
  for (const output of outputs) {
    if (output.type === 'chunk' && output.facadeModuleId) {
      facadeToChunk.set(output.facadeModuleId, output.fileName);
    }
  }

  const assets: Promise<AssetBuildAsset>[] = [];
  const assetIdMap = new Map<string, number>();

  function getAssetId(file: string) {
    let id = assetIdMap.get(file);

    if (id == null) {
      assets.push(loadAsset(file, bundle[file]!, {inline, base}));
      id = assets.length - 1;
      assetIdMap.set(file, id);
    }

    return id;
  }

  const manifest: AssetBuildManifest = {
    key: key && key.size > 0 ? key.toString() : undefined,
    base,
    priority,
    assets: [],
    attributes: format === 'es' ? {2: {type: 'module'}} : {2: {defer: ''}},
    entries: {} as any,
    modules: {},
  };

  for (const output of outputs) {
    if (output.type === 'asset') {
      if (output.name && output.fileName.endsWith('.js')) {
        // Standalone JS asset (e.g. system.js loader) — treated as a single-script entry
        manifest.modules[output.name] = makeEntry({script: getAssetId(output.fileName)});

        manifest.entries[`./${output.name}`] = output.name;
      }

      continue;
    }

    if (!output.isDynamicEntry && !output.isEntry) {
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

    const isCSS = moduleID.endsWith('.css');

    if (isCSS) {
      // CSS-only entry: rollup creates a JS wrapper we exclude; keep only the CSS file
      const cssFiles = [output.fileName, ...output.imports].filter((f) =>
        f.endsWith('.css'),
      );
      manifest.modules[moduleID] = makeEntry({
        style: cssFiles[0] != null ? getAssetId(cssFiles[0]) : undefined,
        styleSync:
          cssFiles.length > 1 ? cssFiles.slice(1).map(getAssetId) : undefined,
      });
    } else {
      // JS entry: separate sync deps from CSS, and resolve dynamic imports
      const asyncFileNames = (output.dynamicImports ?? [])
        .map((mid) => facadeToChunk.get(mid))
        .filter((f): f is string => f != null);

      manifest.modules[moduleID] = buildModuleEntry(
        output.fileName,
        output.imports,
        asyncFileNames,
        {dependencyMap, getAssetId},
      );
    }
  }

  manifest.assets = await Promise.all(assets);

  await fs.mkdir(path.dirname(file), {recursive: true});
  await fs.writeFile(file, JSON.stringify(manifest, null, 2));
}

const SRI_ALGORITHM = 'sha384';

async function loadAsset(
  file: string,
  chunk: OutputChunk | OutputAsset,
  {inline, base}: {inline?: Set<string>; base: string},
): Promise<AssetBuildAsset> {
  const asset: AssetBuildAsset = [file.endsWith('.css') ? 1 : 2, file];

  const source = 'code' in chunk ? chunk.code : (chunk.source as string);

  if (inline?.has(chunk.name!)) {
    asset[2] = await normalizeInlineSource({base, file, source, chunk});
  } else {
    try {
      const hash = createHash(SRI_ALGORITHM)
        .update('code' in chunk ? chunk.code : chunk.source)
        .digest()
        .toString('base64');

      asset[2] = `${SRI_ALGORITHM}-${hash}`;
    } catch {}
  }

  return asset;
}

async function normalizeInlineSource({
  base,
  file,
  source,
  chunk,
}: {
  base: string;
  file: string;
  source: string;
  chunk: OutputChunk | OutputAsset;
}) {
  // Only rewrite JS code; non-JS assets (e.g., CSS) are returned as-is
  const isJavaScript = 'code' in chunk;
  if (!isJavaScript) return source;

  const {parse: parseImports} = await import('es-module-lexer');

  const [imports] = await parseImports(source);

  if (imports.length > 0) {
    let resultSource = source;

    // Apply edits from the end to avoid messing up indices
    const sorted = [...imports].sort((a, b) => b.s - a.s);

    for (const imported of sorted) {
      const start = imported.s;
      const end = imported.e;

      const specWithQuotes = resultSource.slice(start, end);
      const quote = specWithQuotes[0];
      const last = specWithQuotes[specWithQuotes.length - 1];
      if ((quote !== '"' && quote !== "'") || last !== quote) continue;

      const spec = specWithQuotes.slice(1, -1);
      if (!isRelativeSpecifier(spec)) continue;

      const resolved = resolveSpecifierRelativeToFile(spec, {base, file});
      const replaced = `${quote}${resolved}${quote}`;
      resultSource =
        resultSource.slice(0, start) + replaced + resultSource.slice(end);
    }

    source = resultSource;
  }

  return source;
}

function defaultModuleID({imported}: {imported: string}) {
  return imported.startsWith('/')
    ? path.relative(process.cwd(), imported)
    : imported.startsWith('\0')
      ? imported.replace('\0', '')
      : imported;
}

/**
 * Creates a compact `AssetBuildModuleEntry` object with numeric string keys,
 * omitting any positions that are undefined or empty.
 *
 * The result is typed as the tuple `AssetBuildModuleEntry` but serialized as
 * a plain object so the manifest stays compact (no JSON nulls for gaps).
 */
function makeEntry({
  script,
  style,
  scriptSync,
  styleSync,
  scriptAsync,
  styleAsync,
}: {
  script?: number;
  style?: number;
  scriptSync?: number[];
  styleSync?: number[];
  scriptAsync?: number[];
  styleAsync?: number[];
}): AssetBuildModuleEntry {
  const entry: Record<number, number | number[]> = {};
  if (script != null) entry[0] = script;
  if (style != null) entry[1] = style;
  if (scriptSync?.length) entry[2] = scriptSync;
  if (styleSync?.length) entry[3] = styleSync;
  if (scriptAsync?.length) entry[4] = scriptAsync;
  if (styleAsync?.length) entry[5] = styleAsync;
  return entry as unknown as AssetBuildModuleEntry;
}

/**
 * Builds a module entry for a JS chunk, separating sync/async JS and CSS deps.
 *
 * `output.imports` may contain both JS chunks and CSS assets — rollup CSS plugins
 * emit CSS as synthetic imports on the JS chunk that owns them.
 */
function buildModuleEntry(
  entryFileName: string,
  syncImports: string[],
  asyncFileNames: string[],
  {
    dependencyMap,
    getAssetId,
  }: {
    dependencyMap: Map<string, string[]>;
    getAssetId(file: string): number;
  },
) {
  const syncJsFiles = new Set<string>();
  const entryStyleFiles: string[] = [];
  const syncStyleFiles = new Set<string>();

  for (const file of syncImports) {
    if (file.endsWith('.css')) {
      entryStyleFiles.push(file);
    } else {
      visitJsDep(file, syncJsFiles, syncStyleFiles, dependencyMap);
    }
  }

  // CSS from each dynamic import chunk and its transitive sync deps
  const asyncStyleFiles = new Set<string>();
  const visitedAsync = new Set<string>();
  for (const asyncFileName of asyncFileNames) {
    visitJsDep(asyncFileName, visitedAsync, asyncStyleFiles, dependencyMap);
  }

  return makeEntry({
    script: getAssetId(entryFileName),
    style: entryStyleFiles[0] != null ? getAssetId(entryStyleFiles[0]) : undefined,
    scriptSync: syncJsFiles.size > 0 ? [...syncJsFiles].map(getAssetId) : undefined,
    styleSync: syncStyleFiles.size > 0 ? [...syncStyleFiles].map(getAssetId) : undefined,
    scriptAsync: asyncFileNames.length > 0 ? asyncFileNames.map(getAssetId) : undefined,
    styleAsync: asyncStyleFiles.size > 0 ? [...asyncStyleFiles].map(getAssetId) : undefined,
  });
}

function visitJsDep(
  file: string,
  visitedJs: Set<string>,
  styleFiles: Set<string>,
  dependencyMap: Map<string, string[]>,
) {
  if (visitedJs.has(file)) return;
  visitedJs.add(file);

  for (const dep of dependencyMap.get(file) ?? []) {
    if (dep.endsWith('.css')) {
      styleFiles.add(dep);
    } else {
      visitJsDep(dep, visitedJs, styleFiles, dependencyMap);
    }
  }
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

function isRelativeSpecifier(specifier: string) {
  return (
    specifier === '.' ||
    specifier.startsWith('./') ||
    specifier.startsWith('../')
  );
}

function resolveSpecifierRelativeToFile(
  specifier: string,
  {base: assetsBase, file}: {base: string; file: string},
) {
  const path = `${assetsBase}${file}`;
  const isAbsolutePath = path.startsWith('/');
  const base = new URL(
    path,
    isAbsolutePath ? 'https://example.com' : undefined,
  );

  const resolved = new URL(specifier, base);
  return isAbsolutePath ? resolved.pathname : resolved.href;
}
