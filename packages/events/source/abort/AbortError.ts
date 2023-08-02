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
