import * as path from 'path';
import {readFile} from 'fs/promises';
import {createHash} from 'crypto';

import type {Plugin} from 'rollup';
import * as mime from 'mrmime';

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

      const file = await readFile(moduleId, {
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
      const content = await readFile(file);

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
