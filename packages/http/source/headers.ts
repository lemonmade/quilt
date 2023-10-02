/**
 * A `Headers` object that can’t be mutated, typically because it
 * represents the headers in a request.
 */
export interface ReadonlyHeaders
  extends Omit<Headers, 'set' | 'append' | 'delete'> {
  [Symbol.iterator]: Headers[typeof Symbol.iterator];
}
