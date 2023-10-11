export type ValueOrPromise<T> = T | (() => T | Promise<T>);

export async function resolveValueOrPromise<T>(
  valueOrPromise: ValueOrPromise<T>,
): Promise<T> {
  return typeof valueOrPromise === 'function'
    ? (valueOrPromise as () => Promise<T>)()
    : valueOrPromise;
}
