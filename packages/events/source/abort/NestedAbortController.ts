/**
 * An `AbortController` that will automatically abort when any of
 * its "parent" `AbortController`s abort. This is useful for when
 * you have nested asynchronous operations that may abort independently.
 * The `AbortController` can also be independently aborted.
 *
 * To associate the parent `AbortController`s, pass their signals
 * as arguments to the constructor.
 *
 * @example
 * import {NestedAbortController} from '@shopify/events';
 *
 * const parent = new AbortController();
 * const nested = new NestedAbortController(parent.signal);
 *
 * parent.abort();
 * nested.signal.aborted; // true
 */
export class NestedAbortController extends AbortController {
  constructor(
    ...parents: Pick<AbortSignal, 'aborted' | 'reason' | 'addEventListener'>[]
  ) {
    super();

    const abortedSignal = parents.find((signal) => signal.aborted);

    if (abortedSignal) {
      this.abort(abortedSignal.reason);
    } else {
      const abort = (event: Event) =>
        this.abort((event.target as AbortSignal).reason);
      const options = {signal: this.signal};

      for (const signal of parents) {
        signal.addEventListener('abort', abort, options);
      }
    }
  }
}
