export {
  HttpMethod,
  ResponseType,
  StatusCode,
  ContentSecurityPolicyDirective,
  ContentSecurityPolicySandboxAllow,
  ContentSecurityPolicySpecialSource,
  PermissionsPolicyDirective,
  PermissionsPolicySpecialSource,
} from '@quilted/http';

export * from '@quilted/browser/server';

export {
  BrowserDetailsContext,
  useBrowserDetails,
  BrowserAssetsManifestContext,
  useBrowserAssetsManifest,
  BrowserEffectsAreActiveContext,
  useBrowserEffectsAreActive,
} from './context.ts';

export {Link} from './components/Link.tsx';
export {Meta} from './components/Meta.tsx';
export {ThemeColor} from './components/ThemeColor.tsx';
export {Title} from './components/Title.tsx';
export {Favicon} from './components/Favicon.tsx';

async function asyncNoop() {}

export {
  asyncNoop as renderAppToHTMLString,
  asyncNoop as renderAppToHTMLResponse,
  asyncNoop as renderToHTMLString,
  asyncNoop as renderToHTMLResponse,
};

function noopHook() {}

export {
  noopHook as useModuleAssets,
  noopHook as useBrowserResponse,
  noopHook as useBrowserResponseAction,
  noopHook as useCacheControl,
  noopHook as useContentSecurityPolicy,
  noopHook as useCrossOriginEmbedderPolicy,
  noopHook as useCrossOriginOpenerPolicy,
  noopHook as useCrossOriginResourcePolicy,
  noopHook as useOGMeta,
  noopHook as usePermissionsPolicy,
  noopHook as useResponseRedirect,
  noopHook as useResponseHeader,
  noopHook as useDeleteResponseCookie,
  noopHook as useResponseCookie,
  noopHook as useResponseStatus,
  noopHook as useSearchRobots,
  noopHook as useResponseSerialization,
  noopHook as useStrictTransportSecurity,
  noopHook as useViewport,
};

function NoopComponent() {
  return null;
}

export {
  NoopComponent as CacheControl,
  NoopComponent as ContentSecurityPolicy,
  NoopComponent as CrossOriginEmbedderPolicy,
  NoopComponent as CrossOriginOpenerPolicy,
  NoopComponent as CrossOriginResourcePolicy,
  NoopComponent as HTML,
  NoopComponent as HTMLBody,
  NoopComponent as HTMLHead,
  NoopComponent as OGMeta,
  NoopComponent as NotFound,
  NoopComponent as PermissionsPolicy,
  NoopComponent as ResponseCookie,
  NoopComponent as ResponseHeader,
  NoopComponent as ResponseStatus,
  NoopComponent as HTMLStreamBoundary,
  NoopComponent as HTMLPlaceholderApp,
  NoopComponent as HTMLPlaceholderAsyncAssets,
  NoopComponent as HTMLPlaceholderEntryAssets,
  NoopComponent as HTMLPlaceholderSerializations,
  NoopComponent as ScriptAsset,
  NoopComponent as ScriptAssetPreload,
  NoopComponent as SearchRobots,
  NoopComponent as Serialization,
  NoopComponent as StrictTransportSecurity,
  NoopComponent as StyleAsset,
  NoopComponent as StyleAssetPreload,
  NoopComponent as Viewport,
};

export const HTML_TEMPLATE_FRAGMENT = '';
