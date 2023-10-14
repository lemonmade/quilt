import type {Plugin} from 'rollup';

export interface Options {
  minify?: boolean;
  emit?: boolean;
}

const CSS_REGEX = /\.css$/;
const CSS_MODULE_REGEX = /\.module\.css$/;

export function css({minify = true, emit = true}: Options) {
  const styles = new Map<string, string>();

  return {
    name: '@quilted/css',
    async transform(code, id) {
      if (!CSS_REGEX.test(id)) return;

      const {transform} = await import('lightningcss');

      const transformed = transform({
        filename: id,
        code: new TextEncoder().encode(code),
        cssModules: CSS_MODULE_REGEX.test(id),
        minify: emit && minify,
      });

      styles.set(id, new TextDecoder().decode(transformed.code));

      const exports = transformed.exports
        ? Object.fromEntries(
            Object.entries(transformed.exports).map(([key, exported]) => [
              key,
              exported.name,
            ]),
          )
        : undefined;

      return {
        code: exports
          ? `export default JSON.parse(${JSON.stringify(
              JSON.stringify(exports),
            )})`
          : `export default undefined;`,
        map: {mappings: ''},
        moduleSideEffects: 'no-treeshake',
      };
    },
    async renderChunk(_, chunk) {
      if (!emit) return null;

      let chunkCss = '';

      for (const id of Object.keys(chunk.modules)) {
        if (CSS_REGEX.test(id) && styles.has(id)) {
          chunkCss += styles.get(id);
        }
      }

      if (chunkCss.length === 0) return null;

      const code = chunkCss;

      // if (minify) {
      //   const {default: CleanCSS} = await import('clean-css');

      //   const cleaner = new CleanCSS({
      //     rebase: false,
      //   });

      //   const minified = cleaner.minify(chunkCss);

      //   if (minified.errors.length > 0) {
      //     throw minified.errors[0];
      //   }

      //   code = minified.styles;
      // }

      const fileHandle = this.emitFile({
        type: 'asset',
        name: `${chunk.fileName.split('.')[0]}.css`,
        source: code,
      });

      chunk.imports.push(this.getFileName(fileHandle));

      return null;
    },
  } satisfies Plugin;
}
