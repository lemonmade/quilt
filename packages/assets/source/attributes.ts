import type {Asset} from './types';

export function styleAssetAttributes(
  {source, attributes}: Asset,
  {baseUrl}: {baseUrl?: URL} = {},
): Partial<HTMLLinkElement> {
  const {
    rel = 'stylesheet',
    type = 'text/css',
    crossorigin: explicitCrossOrigin,
    ...extraAttributes
  } = (attributes ?? {}) as any;

  const crossorigin =
    explicitCrossOrigin ??
    (source[0] !== '/' &&
      (baseUrl == null || !source.startsWith(baseUrl.origin)));

  const href =
    crossorigin && baseUrl ? source.slice(baseUrl.origin.length) : source;

  return {
    rel,
    type,
    href,
    crossorigin:
      crossorigin === true
        ? ''
        : typeof crossorigin === 'string'
        ? crossorigin
        : undefined,
    ...extraAttributes,
  };
}

export function styleAssetPreloadAttributes(
  {source, attributes}: Asset,
  {baseUrl}: {baseUrl?: URL} = {},
): Partial<HTMLLinkElement> {
  const {crossorigin: explicitCrossOrigin} = (attributes ?? {}) as any;

  const crossorigin =
    explicitCrossOrigin ??
    (source[0] !== '/' &&
      (baseUrl == null || !source.startsWith(baseUrl.origin)));

  const href =
    crossorigin && baseUrl ? source.slice(baseUrl.origin.length) : source;

  return {
    rel: 'preload',
    href,
    as: 'style',
    // @ts-expect-error - rendering real HTML, so using the attribute rather than property names
    crossorigin:
      crossorigin === true
        ? ''
        : typeof crossorigin === 'string'
        ? crossorigin
        : undefined,
  };
}

export function scriptAssetAttributes(
  {source, attributes}: Asset,
  {baseUrl}: {baseUrl?: URL} = {},
): Partial<HTMLScriptElement> {
  const {
    type = 'text/javascript',
    crossorigin: explicitCrossOrigin,
    ...extraAttributes
  } = (attributes ?? {}) as any;

  const crossorigin =
    explicitCrossOrigin ??
    (source[0] !== '/' &&
      (baseUrl == null || !source.startsWith(baseUrl.origin)));

  const src =
    crossorigin && baseUrl ? source.slice(baseUrl.origin.length) : source;

  return {
    type,
    src,
    crossorigin:
      crossorigin === true
        ? ''
        : typeof crossorigin === 'string'
        ? crossorigin
        : undefined,
    ...extraAttributes,
  };
}

export function scriptAssetPreloadAttributes(
  {source, attributes}: Asset,
  {baseUrl}: {baseUrl?: URL} = {},
): Partial<HTMLLinkElement> {
  const {type, crossorigin: explicitCrossOrigin} = (attributes ?? {}) as any;

  const crossorigin =
    explicitCrossOrigin ??
    (source[0] !== '/' &&
      (baseUrl == null || !source.startsWith(baseUrl.origin)));

  const href =
    crossorigin && baseUrl ? source.slice(baseUrl.origin.length) : source;

  return {
    rel: type === 'module' ? 'modulepreload' : 'preload',
    href,
    as: 'script',
    // @ts-expect-error - rendering real HTML, so using the attribute rather than property names
    crossorigin:
      crossorigin === true
        ? ''
        : typeof crossorigin === 'string'
        ? crossorigin
        : undefined,
  };
}
