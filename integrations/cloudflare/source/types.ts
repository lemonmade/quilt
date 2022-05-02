export type KVNamespaceBinding = any;

export interface CloudflareRequestContext extends ExecutionContext {
  readonly cf?: IncomingRequestCfProperties;
  readonly env: Record<string, KVNamespaceBinding>;
}

declare module '@quilted/quilt' {
  interface ServerRenderRequestContext extends CloudflareRequestContext {}
}

declare module '@quilted/quilt/http-handlers' {
  interface RequestContext extends CloudflareRequestContext {}
}
