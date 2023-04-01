// Originally, I wanted to just re-export `preact/compat/server`,
// but it lists export conditions in the wrong order.
// @see https://github.com/preactjs/preact/issues/3488

// I also wanted to export the named exports from this package, but
// unfortunately those are busted in the CommonJS version of the
// library.
// @see https://github.com/preactjs/preact-render-to-string/issues/197
export {renderToString, renderToStaticMarkup} from 'preact-render-to-string';
