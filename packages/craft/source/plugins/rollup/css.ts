import type {Plugin} from 'rollup';
import type {
  AcceptedPlugin as PostCSSPlugin,
  Result as PostCSSResult,
  ProcessOptions as PostCSSProcessOptions,
  SourceMap,
} from 'postcss';
import type {PostCSSModulesOptions} from '../../tools/postcss';

export interface Options {
  minify?: boolean;
  extract?: boolean;
  postcssPlugins: () => Promise<PostCSSPlugin[]>;
  postcssProcessOptions: () => Promise<PostCSSProcessOptions>;
  postcssCSSModulesOptions: (
    initial: PostCSSModulesOptions,
  ) => Promise<PostCSSModulesOptions>;
}

const CSS_REGEX = /\.css$/;
const CSS_MODULE_REGEX = /\.module\.css$/;

export function cssRollupPlugin({
  minify = true,
  extract = true,
  ...transformOptions
}: Options): Plugin {
  const styles = new Map<string, string>();

  return {
    name: '@quilt/css',
    async transform(code, id) {
      if (!CSS_REGEX.test(id)) return;

      const transformed = await transformCss(code, id, {
        extract,
        ...transformOptions,
      });

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
        name: `${chunk.fileName.split('.')[0]}.css`,
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
  options: Pick<
    Options,
    'postcssPlugins' | 'postcssProcessOptions' | 'postcssCSSModulesOptions'
  > & {
    extract: boolean;
  },
): Promise<{
  code: string;
  ast?: PostCSSResult;
  map?: SourceMap;
  modules?: Record<string, string>;
}> {
  const isCssModule = CSS_MODULE_REGEX.test(id);

  const [
    {default: postcss},
    {default: postcssModules},
    postcssPlugins,
    postcssProcessOptions,
  ] = await Promise.all([
    import('postcss'),
    import('postcss-modules'),
    options.extract ? options.postcssPlugins() : Promise.resolve([]),
    options.postcssProcessOptions(),
  ]);

  let modules: Record<string, string> | undefined;

  const plugins = [...postcssPlugins];

  if (isCssModule) {
    const cssModulesOptions = await options.postcssCSSModulesOptions({});

    plugins.push(
      postcssModules({
        ...cssModulesOptions,
        getJSON(filename, parsedModules, ...rest) {
          modules = parsedModules;
          return cssModulesOptions.getJSON?.(filename, parsedModules, ...rest);
        },
      }),
    );
  }

  if (plugins.length === 0) {
    return {code};
  }

  const postcssResult = await postcss(plugins).process(code, {
    ...postcssProcessOptions,
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
