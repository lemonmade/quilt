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

// @see https://github.com/nodejs/node/blob/master/lib/internal/errors.js#L822-L834
export class AbortError extends Error {
  readonly code = 'ABORT_ERR';
  readonly name = 'AbortError';

  constructor(message = 'The operation was aborted') {
    super(message);
  }
}
