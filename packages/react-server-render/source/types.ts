export type ServerActionPerform = () => any;

export interface ServerRenderPass {
  index: number;
  finished: boolean;
  cancelled: boolean;
  renderDuration: number;
  resolveDuration: number;
}

export interface ServerActionKind {
  readonly id: symbol;
  betweenEachPass?(pass: ServerRenderPass): any;
  afterEachPass?(pass: ServerRenderPass): any;
}

export interface ServerActionOptions {
  readonly deferred?: boolean;
}

export interface ServerRenderRequestContext {}
