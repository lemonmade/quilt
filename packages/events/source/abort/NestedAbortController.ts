export class NestedAbortController extends AbortController {
  constructor(...parents: AbortSignal[]) {
    super();

    const abortedSignal = parents.find((signal) => signal.aborted);

    if (abortedSignal) {
      this.abort(abortedSignal.reason);
    } else {
      const abort = (event: Event) =>
        this.abort((event.target as AbortSignal).reason);
      const options = {signal: this.signal};

      for (const signal of parents) {
        signal?.addEventListener('abort', abort, options);
      }
    }
  }
}
