import {
  ServerRenderEffectKind,
  ServerRenderPass,
  ServerRenderEffectAction,
  ServerRenderEffectOptions,
} from './types';

interface Options {
  includeEffects?: symbol[] | boolean;
}

export class ServerRenderManager {
  private pendingEffects: Promise<any>[] = [];
  private deferredEffects: ServerRenderEffectAction[] = [];
  private effectKinds = new Set<ServerRenderEffectKind>();
  private readonly includeEffects: NonNullable<Options['includeEffects']>;

  constructor({includeEffects = true}: Options = {}) {
    this.includeEffects = includeEffects;
  }

  seal() {
    for (const perform of [...this.deferredEffects].reverse()) {
      const result = perform();
      if (isPromise(result)) this.pendingEffects.push(result);
    }

    this.deferredEffects.length = 0;

    return {finished: this.pendingEffects.length === 0};
  }

  reset() {
    this.pendingEffects = [];
    this.effectKinds = new Set();
  }

  performEffect(
    perform: ServerRenderEffectAction,
    kind?: ServerRenderEffectKind,
    options?: ServerRenderEffectOptions,
  ) {
    if (kind != null && !this.shouldPerformEffectKind(kind)) {
      return false;
    }

    if (kind != null) {
      this.effectKinds.add(kind);
    }

    if (options?.deferred) {
      this.deferredEffects.push(perform);
      return true;
    }

    const effect = perform();

    if (isPromise(effect)) {
      this.pendingEffects.push(effect);
    }

    return true;
  }

  async resolveAllEffects() {
    await Promise.all(this.pendingEffects);
  }

  async betweenEachPass(pass: ServerRenderPass) {
    await Promise.all(
      [...this.effectKinds].map((kind) =>
        typeof kind.betweenEachPass === 'function'
          ? kind.betweenEachPass(pass)
          : Promise.resolve(),
      ),
    );
  }

  async afterEachPass(pass: ServerRenderPass) {
    const results = await Promise.all(
      [...this.effectKinds].map((kind) =>
        typeof kind.afterEachPass === 'function'
          ? kind.afterEachPass(pass)
          : Promise.resolve(),
      ),
    );

    return results.every((result) => result !== false);
  }

  private shouldPerformEffectKind(kind: ServerRenderEffectKind) {
    const {includeEffects} = this;

    if (includeEffects === false) {
      return false;
    }

    return (
      includeEffects === true ||
      (kind != null && includeEffects.includes(kind.id))
    );
  }
}

function isPromise(value: unknown): value is Promise<unknown> {
  return value != null && 'then' in (value as any);
}
