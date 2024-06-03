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

export {BrowserDetailsContext} from './context.ts';

function noopHook() {}

export {
  noopHook as useAssetsCacheKey,
  noopHook as useModuleAssets,
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
  NoopComponent as OGMeta,
  NoopComponent as NotFound,
  NoopComponent as PermissionsPolicy,
  NoopComponent as ResponseCookie,
  NoopComponent as ResponseHeader,
  NoopComponent as ResponseStatus,
  NoopComponent as ScriptAsset,
  NoopComponent as ScriptAssetPreload,
  NoopComponent as SearchRobots,
  NoopComponent as Serialize,
  NoopComponent as StrictTransportSecurity,
  NoopComponent as StyleAsset,
  NoopComponent as StyleAssetPreload,
  NoopComponent as Viewport,
};
