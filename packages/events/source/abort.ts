export type AbortBehavior = 'throws' | 'returns';

export class NestedAbortController extends AbortController {
  private readonly cleanup = new AbortController();

  constructor(parent?: AbortSignal) {
    super();
    parent?.addEventListener('abort', () => this.abort(), {
      signal: this.cleanup.signal,
    });
  }

  abort(reason?: any) {
    this.cleanup.abort();
    super.abort(reason);
  }
}

export function anyAbortSignal(...signals: readonly AbortSignal[]) {
  const controller = new AbortController();

  if (signals.some((signal) => signal.aborted)) {
    controller.abort();
  } else {
    for (const signal of signals) {
      signal.addEventListener('abort', () => controller.abort(signal.reason), {
        signal: controller.signal,
      });
    }
  }

  return controller.signal;
}

// @see https://github.com/nodejs/node/blob/master/lib/internal/errors.js#L822-L834
export class AbortError extends Error {
  static test(error: unknown): error is AbortError {
    return error != null && (error as any).code === 'ABORT_ERR';
  }

  readonly code = 'ABORT_ERR';
  readonly name = 'AbortError';

  constructor(message = 'The operation was aborted') {
    super(message);
  }
}
