import {ServerRenderEffectKind, ServerRenderPass, ServerRenderEffectAction} from './types';

interface Options {
  includeEffects?: symbol[] | boolean;
}

export class ServerRenderManager {
  private pendingEffects: Promise<any>[] = [];
  private effectKinds = new Set<ServerRenderEffectKind>();
  private readonly includeEffects: NonNullable<Options['includeEffects']>;

  get finished() {
    return this.pendingEffects.length === 0;
  }

  constructor({includeEffects = true}: Options = {}) {
    this.includeEffects = includeEffects;
  }

  reset() {
    this.pendingEffects = [];
    this.effectKinds = new Set();
  }

  performEffect(perform: ServerRenderEffectAction, kind?: ServerRenderEffectKind) {
    if (kind != null && !this.shouldPerformEffectKind(kind)) {
      return false;
    }

    const effect = perform();

    if (kind != null) {
      this.effectKinds.add(kind);
    }

    if (effect != null && 'then' in effect) {
      this.pendingEffects.push(effect);
    }

    return true;
  }

  async resolveAllEffects() {
    await Promise.all(this.pendingEffects);
  }

  async betweenEachPass(pass: ServerRenderPass) {
    await Promise.all(
      [...this.effectKinds].map(kind =>
        typeof kind.betweenEachPass === 'function'
          ? kind.betweenEachPass(pass)
          : Promise.resolve(),
      ),
    );
  }

  async afterEachPass(pass: ServerRenderPass) {
    const results = await Promise.all(
      [...this.effectKinds].map(kind =>
        typeof kind.afterEachPass === 'function'
          ? kind.afterEachPass(pass)
          : Promise.resolve(),
      ),
    );

    return results.every(result => result !== false);
  }

  private shouldPerformEffectKind(kind: ServerRenderEffectKind) {
    const {includeEffects} = this;

    if (includeEffects === false) {
      return false;
    }

    return includeEffects === true || (kind != null && includeEffects.includes(kind.id));
  }
}
