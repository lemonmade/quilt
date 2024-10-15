function noopRenderToString() {}

export {
  noopRenderToString as renderToString,
  noopRenderToString as renderToStringAsync,
  noopRenderToString as renderToStaticMarkup,
};
export * from '@quilted/preact-browser/server';
export * from '@quilted/assets';

export {parseAcceptLanguageHeader} from '@quilted/preact-localize';

function noopCreateRequestRouterLocalization() {}
export {noopCreateRequestRouterLocalization as createRequestRouterLocalization};

function noopRenderToResponse() {}
export {noopRenderToResponse as renderToResponse};

function NoopServerContext() {
  return null;
}
export {NoopServerContext as ServerContext};
