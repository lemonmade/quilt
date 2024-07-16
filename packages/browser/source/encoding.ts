const MAP = '_@m';
const SET = '_@s';
const URL_ID = '_@u';
const DATE = '_@d';
const REGEXP = '_@r';
const UINT8_ARRAY = '_@u8';
const UINT16_ARRAY = '_@u16';
const UINT32_ARRAY = '_@u32';

export function encode(value: unknown, seen = new Map<any, any>()): unknown {
  const seenValue = seen.get(value);
  if (seenValue) return seenValue;

  seen.set(value, [undefined]);

  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      const result = value.map((item) => encode(item, seen));
      seen.set(value, result);
      return result;
    }

    if (value instanceof Uint8Array) {
      const result = {[UINT8_ARRAY]: encodeUintArray(value)};
      seen.set(value, result);
      return result;
    }

    if (value instanceof Uint16Array) {
      const result = {[UINT16_ARRAY]: encodeUintArray(value)};
      seen.set(value, result);
      return result;
    }

    if (value instanceof Uint32Array) {
      const result = {[UINT32_ARRAY]: encodeUintArray(value)};
      seen.set(value, result);
      return result;
    }

    // TODO: avoid this if using a `structuredClone` postMessage-ing object?
    if (value instanceof RegExp) {
      const result = {[REGEXP]: [value.source, value.flags]};
      seen.set(value, result);
      return result;
    }

    if (value instanceof URL) {
      const result = {[URL_ID]: value.href};
      seen.set(value, result);
      return result;
    }

    if (value instanceof Date) {
      const result = {[DATE]: value.toISOString()};
      seen.set(value, result);
      return result;
    }

    if (value instanceof Map) {
      const entries = [...value.entries()].map(([key, value]) => {
        return [encode(key, seen), encode(value, seen)];
      });
      const result = {[MAP]: entries};
      seen.set(value, result);
      return result;
    }

    if (value instanceof Set) {
      const entries = [...value].map((entry) => encode(entry, seen));
      const result = {[SET]: entries};
      seen.set(value, result);
      return result;
    }

    if (isBasicObject(value)) {
      const result: Record<string, any> = {};

      for (const key of Object.keys(value as any)) {
        result[key] = encode((value as any)[key], seen);
      }

      seen.set(value, result);

      return result;
    }
  }

  seen.set(value, value);
  return value;
}

export function decode(value: unknown): unknown {
  if (typeof value === 'object') {
    if (value == null) {
      return value as any;
    }

    if (Array.isArray(value)) {
      return value.map((value) => decode(value));
    }

    if (UINT8_ARRAY in value) {
      return decodeUintArray((value as {[UINT8_ARRAY]: string})[UINT8_ARRAY]);
    }

    if (UINT16_ARRAY in value) {
      return new Uint16Array(
        decodeUintArray(
          (value as {[UINT16_ARRAY]: string})[UINT16_ARRAY],
        ).buffer,
      );
    }

    if (UINT32_ARRAY in value) {
      return new Uint32Array(
        decodeUintArray(
          (value as {[UINT32_ARRAY]: string})[UINT32_ARRAY],
        ).buffer,
      );
    }

    if (REGEXP in value) {
      return new RegExp(...(value as {[REGEXP]: [string, string]})[REGEXP]);
    }

    if (URL_ID in value) {
      return new URL((value as {[URL_ID]: string})[URL_ID]);
    }

    if (DATE in value) {
      return new Date((value as {[DATE]: string})[DATE]);
    }

    if (MAP in value) {
      return new Map(
        (value as {[MAP]: [any, any]})[MAP].map(([key, value]) => [
          decode(key),
          decode(value),
        ]),
      );
    }

    if (SET in value) {
      return new Set(
        (value as {[SET]: any[]})[SET].map((entry) => decode(entry)),
      );
    }

    if (!isBasicObject(value)) {
      return value;
    }

    const result: Record<string | symbol, any> = {};

    for (const key of Object.keys(value)) {
      result[key] = decode((value as any)[key]);
    }

    return result;
  }

  return value;
}

function encodeUintArray(array: Uint8Array | Uint16Array | Uint32Array) {
  let binary = '';
  const bytes = new Uint8Array(array.buffer);
  const length = bytes.byteLength;

  for (let i = 0; i < length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }

  return btoa(binary);
}

function decodeUintArray(base64String: string) {
  const binary = atob(base64String);
  const result = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    result[i] = binary.charCodeAt(i);
  }

  return result;
}

function isBasicObject(value: unknown) {
  if (value == null || typeof value !== 'object') return false;

  const prototype = Object.getPrototypeOf(value);
  return prototype == null || prototype === Object.prototype;
}
