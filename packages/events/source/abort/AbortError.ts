// @see https://github.com/nodejs/node/blob/master/lib/internal/errors.js#L822-L834
/**
 * An `Error` that indicates that an operation was aborted before
 * it finished.
 *
 * @see https://github.com/nodejs/node/blob/5c65565108c626884c5c722bb512c7c1e5c1c809/lib/internal/errors.js#L843-L855
 */
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
