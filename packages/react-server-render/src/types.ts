export type ServerRenderEffectAction = () => any;

export interface ServerRenderPass {
  index: number;
  finished: boolean;
  cancelled: boolean;
  renderDuration: number;
  resolveDuration: number;
}

export interface ServerRenderEffectKind {
  readonly id: symbol;
  betweenEachPass?(pass: ServerRenderPass): any;
  afterEachPass?(pass: ServerRenderPass): any;
}
