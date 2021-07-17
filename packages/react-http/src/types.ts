/**
 * The shared header API that is supported on both server and client.
 */
export interface ReadonlyHeaders
  extends Omit<Headers, 'set' | 'append' | 'delete'> {
  [Symbol.iterator](): IterableIterator<[string, string]>;
}
