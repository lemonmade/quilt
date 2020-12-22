export interface ReadonlyHeaders {
  get(header: string): string | undefined;
}

export interface Headers extends ReadonlyHeaders {
  set(header: string): void;
}
