export {
  renderToString,
  renderToStringAsync,
  renderToStaticMarkup,
} from 'preact-render-to-string';
export * from '@quilted/preact-browser/server';
export * from '@quilted/assets';

export {parseAcceptLanguageHeader} from '@quilted/preact-localize';
export {createRequestRouterLocalization} from '@quilted/preact-localize/request-router';

export {
  renderToResponse,
  type RenderToResponseOptions,
  type RenderHTMLFunction,
} from './server/request-router.tsx';
export {ServerContext} from './server/ServerContext.tsx';
