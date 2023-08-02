export class TimedAbortController extends AbortController {
  readonly promise: Promise<void>;
  private timeout!: ReturnType<typeof setTimeout>;

  constructor(time: number) {
    super();

    this.promise = new Promise((resolve) => {
      this.timeout = setTimeout(() => {
        if (this.signal.aborted) return;
        this.abort();
        resolve();
      }, time);
    });

    this.signal.addEventListener('abort', () => {
      if (this.timeout) clearTimeout(this.timeout);
    });
  }
}
