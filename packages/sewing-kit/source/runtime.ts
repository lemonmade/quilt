export interface RuntimeBrowser {
  readonly target: 'browser';
}

export interface RuntimeWorker {
  readonly target: 'worker';
}

export interface RuntimeNode {
  readonly target: 'node';
}

export interface RuntimeOther {
  readonly target: string;
  readonly options?: Record<string, unknown>;
}

export type Runtime =
  | RuntimeBrowser
  | RuntimeWorker
  | RuntimeNode
  | RuntimeOther;
