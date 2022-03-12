import type {
  ServerActionKind,
  ServerRenderPass,
  ServerActionPerform,
  ServerActionOptions,
} from './types';

interface Options {
  includeKinds?: symbol[] | boolean;
}

export class ServerRenderManager {
  private pendingActions: Promise<any>[] = [];
  private deferredActions: ServerActionPerform[] = [];
  private actionKinds = new Set<ServerActionKind>();
  private readonly includeKinds: NonNullable<Options['includeKinds']>;

  constructor({includeKinds = true}: Options = {}) {
    this.includeKinds = includeKinds;
  }

  seal() {
    console.log(this);
    for (const perform of [...this.deferredActions].reverse()) {
      const result = perform();
      if (isPromise(result)) this.pendingActions.push(result);
    }

    this.deferredActions.length = 0;

    return {finished: this.pendingActions.length === 0};
  }

  reset() {
    this.pendingActions = [];
    this.actionKinds = new Set();
  }

  perform(
    perform: ServerActionPerform,
    kind?: ServerActionKind,
    options?: ServerActionOptions,
  ) {
    if (kind != null && !this.shouldPerformEffectKind(kind)) {
      return false;
    }

    if (kind != null) {
      this.actionKinds.add(kind);
    }

    if (options?.deferred) {
      this.deferredActions.push(perform);
      return true;
    }

    const effect = perform();

    if (isPromise(effect)) {
      this.pendingActions.push(effect);
    }

    return true;
  }

  async resolveAllEffects() {
    await Promise.all(this.pendingActions);
  }

  async betweenEachPass(pass: ServerRenderPass) {
    await Promise.all(
      [...this.actionKinds].map((kind) =>
        typeof kind.betweenEachPass === 'function'
          ? kind.betweenEachPass(pass)
          : Promise.resolve(),
      ),
    );
  }

  async afterEachPass(pass: ServerRenderPass) {
    const results = await Promise.all(
      [...this.actionKinds].map((kind) =>
        typeof kind.afterEachPass === 'function'
          ? kind.afterEachPass(pass)
          : Promise.resolve(),
      ),
    );

    return results.every((result) => result !== false);
  }

  private shouldPerformEffectKind(kind: ServerActionKind) {
    const {includeKinds} = this;

    if (includeKinds === false) {
      return false;
    }

    return (
      includeKinds === true || (kind != null && includeKinds.includes(kind.id))
    );
  }
}

function isPromise(value: unknown): value is Promise<unknown> {
  return value != null && 'then' in (value as any);
}
