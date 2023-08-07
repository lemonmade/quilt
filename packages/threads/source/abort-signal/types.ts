export type ThreadAbortSignal =
  | {
      aborted: true;
      start?: never;
    }
  | {
      aborted: false;
      start(
        listener: (aborted: boolean) => void | Promise<void>,
      ): boolean | Promise<boolean>;
    };
