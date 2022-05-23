import * as path from 'path';
import {readFile} from 'fs/promises';
import {createHash} from 'crypto';

import type {Plugin} from 'rollup';
import * as mime from 'mrmime';

export function staticAssets({
  emit,
  name,
  baseUrl,
  extensions,
  inlineLimit,
  outputPattern,
}: {
  emit: boolean;
  baseUrl: string;
  extensions: readonly string[];
  inlineLimit: number;
  outputPattern: string;
  name(id: string): string;
}): Plugin {
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
    name: '@quilt/assets',
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
          baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
        }/${filename}`;

        if (emit) {
          this.emitFile({
            name: name(file),
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
  };
}

export function staticAssetsDevelopment({
  root,
  extensions,
}: {
  root: string;
  extensions: readonly string[];
}): Plugin {
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
    name: '@quilt/assets',
    async load(id) {
      if (id.startsWith('\0') || !assetMatcher.test(id)) {
        return null;
      }

      let url: string;

      if (id.startsWith(root)) {
        // in project root, infer short public path
        url = '/' + path.posix.relative(root, id);
      } else {
        // outside of project root, use absolute fs path
        // (this is special handled by the serve static middleware
        url = path.posix.join('/@fs/' + id);
      }

      return `export default ${JSON.stringify(url)};`;
    },
  };
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

const QUERY_PATTERN = /\?.*$/s;
const HASH_PATTERN = /#.*$/s;

function cleanModuleIdentifier(url: string) {
  return url.replace(HASH_PATTERN, '').replace(QUERY_PATTERN, '');
}
