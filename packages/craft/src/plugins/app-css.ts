import type {Plugin} from 'rollup';
import type {
  Plugin as PostCSSPlugin,
  Result as PostCSSResult,
  SourceMap,
} from 'postcss';

import {createProjectPlugin} from '@quilted/sewing-kit';
import type {App} from '@quilted/sewing-kit';
import type {} from '@quilted/sewing-kit-rollup';

export interface Options {
  minify?: boolean;
}

export function appCss(options?: Options) {
  return createProjectPlugin<App>({
    name: 'Quilt.AppCSS',
    build({configure}) {
      configure(({rollupPlugins}, {quiltBrowserEntry = false}) => {
        rollupPlugins?.((plugins) => [
          ...plugins,
          cssRollupPlugin({...options, extract: quiltBrowserEntry}),
        ]);
      });
    },
  });
}

const CSS_REGEX = /\.css$/;
const CSS_MODULE_REGEX = /\.module\.css$/;

function cssRollupPlugin({
  minify = true,
  extract = true,
}: Options & {extract?: boolean} = {}): Plugin {
  const styles = new Map<string, string>();

  return {
    name: '@quilt/css',
    async transform(code, id) {
      if (!CSS_REGEX.test(id)) return;

      const transformed = await transformCss(code, id);

      styles.set(id, transformed.code);

      return {
        code: transformed.modules
          ? `export default ${JSON.stringify(transformed.modules)}`
          : `export default undefined;`,
        map: {mappings: ''},
        moduleSideEffects: 'no-treeshake',
      };
    },
    async renderChunk(_, chunk) {
      if (!extract) return null;

      let chunkCss = '';

      for (const id of Object.keys(chunk.modules)) {
        if (CSS_REGEX.test(id) && styles.has(id)) {
          chunkCss += styles.get(id);
        }
      }

      if (chunkCss.length === 0) return null;

      let code = chunkCss;

      if (minify) {
        const {default: CleanCSS} = await import('clean-css');

        const cleaner = new CleanCSS({
          rebase: false,
        });

        const minified = cleaner.minify(chunkCss);

        if (minified.errors.length > 0) {
          throw minified.errors[0];
        }

        code = minified.styles;
      }

      const fileHandle = this.emitFile({
        type: 'asset',
        name: `${chunk.name}.css`,
        source: code,
      });

      chunk.imports.push(this.getFileName(fileHandle));

      return null;
    },
  };
}

async function transformCss(
  code: string,
  id: string,
): Promise<{
  code: string;
  ast?: PostCSSResult;
  map?: SourceMap;
  modules?: Record<string, string>;
}> {
  const isCssModule = CSS_MODULE_REGEX.test(id);

  const [{default: postcss}, {default: postcssModules}] = await Promise.all([
    import('postcss'),
    import('postcss-modules'),
  ]);

  let modules: Record<string, string> | undefined;

  const plugins: PostCSSPlugin[] = [];

  if (isCssModule) {
    plugins.push(
      postcssModules({
        getJSON(_, parsedModules) {
          modules = parsedModules;
        },
      }),
    );
  }

  if (plugins.length === 0) {
    return {code};
  }

  const postcssResult = await postcss(plugins).process(code, {
    to: id,
    from: id,
  });

  return {
    ast: postcssResult,
    code: postcssResult.css,
    map: postcssResult.map,
    modules,
  };
}
