/**
 * An `AbortController` that will automatically abort after a given
 * amount of time. You can use this to create a timeout for any
 * asynchronous operation that accepts an `AbortSignal`.
 *
 * @example
 * import {TimedAbortController} from '@shopify/events';
 *
 * const controller = new TimedAbortController(1_000);
 * const response = await fetch(url, {signal: controller.signal});
 */
export class TimedAbortController extends AbortController {
  /**
   * A `Promise` that will resolve when the `TimedAbortController` is
   * aborted.
   */
  readonly promise: Promise<void>;

  private timeout!: ReturnType<typeof setTimeout>;
  private resolve!: () => void;

  constructor(time: number) {
    super();

    this.promise = new Promise<void>((resolve) => {
      this.resolve = resolve;
      this.timeout = setTimeout(() => {
        if (this.signal.aborted) return;
        this.abort();
      }, time);
    });

    this.signal.addEventListener(
      'abort',
      () => {
        this.resolve();
        if (this.timeout) clearTimeout(this.timeout);
      },
      {once: true},
    );
  }
}
