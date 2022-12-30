import type {} from '@quilted/quilt';

export interface CloudflareRequestEnvironment {}

export interface CloudflareRequestContext extends ExecutionContext {
  readonly cf?: IncomingRequestCfProperties;
  readonly env: CloudflareRequestEnvironment;
}

declare module '@quilted/quilt' {
  interface ServerRenderRequestContext extends CloudflareRequestContext {}
}

declare module '@quilted/quilt/request-router' {
  interface RequestContext extends CloudflareRequestContext {}
}

// @ts-expect-error This module augmentation does work when consumed in real projects
declare module '@quilted/request-router' {
  interface RequestContext extends CloudflareRequestContext {}
}
