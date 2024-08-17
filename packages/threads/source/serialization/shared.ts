export function isIterator(value: any) {
  return (
    value != null &&
    (Symbol.asyncIterator in value || Symbol.iterator in value) &&
    typeof (value as any).next === 'function'
  );
}

export function isBasicObject(value: unknown) {
  if (value == null || typeof value !== 'object') return false;

  const prototype = Object.getPrototypeOf(value);
  return prototype == null || prototype === Object.prototype;
}
