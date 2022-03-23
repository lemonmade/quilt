// Originally, I wanted to just re-export `preact/compat/server`,
// but it lists export conditions in the wrong order.
// @see https://github.com/preactjs/preact/issues/3488
export * from 'preact-render-to-string';
export {default} from 'preact-render-to-string';
