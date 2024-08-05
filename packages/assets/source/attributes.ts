import type {Asset} from './types.ts';

export function styleAssetAttributes(
  {source, attributes}: Asset,
  {baseURL}: {baseURL?: URL} = {},
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
      (baseURL == null || !source.startsWith(baseURL.origin)) &&
      isFullURL(source));

  const href =
    crossorigin && baseURL ? source.slice(baseURL.origin.length) : source;

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
  {baseURL}: {baseURL?: URL} = {},
): Partial<HTMLLinkElement> {
  const {crossorigin: explicitCrossOrigin, integrity} = (attributes ??
    {}) as any;

  const crossorigin =
    explicitCrossOrigin ??
    (source[0] !== '/' &&
      (baseURL == null || !source.startsWith(baseURL.origin)) &&
      isFullURL(source));

  const href =
    crossorigin && baseURL ? source.slice(baseURL.origin.length) : source;

  return {
    rel: 'preload',
    href,
    integrity,
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
  {baseURL}: {baseURL?: URL} = {},
): Partial<HTMLScriptElement> {
  const {
    type = 'text/javascript',
    crossorigin: explicitCrossOrigin,
    ...extraAttributes
  } = (attributes ?? {}) as any;

  const crossorigin =
    explicitCrossOrigin ??
    (source[0] !== '/' &&
      (baseURL == null || !source.startsWith(baseURL.origin)) &&
      isFullURL(source));

  const src =
    crossorigin && baseURL ? source.slice(baseURL.origin.length) : source;

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
  {baseURL}: {baseURL?: URL} = {},
): Partial<HTMLLinkElement> {
  const {
    type,
    integrity,
    crossorigin: explicitCrossOrigin,
  } = (attributes ?? {}) as any;

  const crossorigin =
    explicitCrossOrigin ??
    (source[0] !== '/' &&
      (baseURL == null || !source.startsWith(baseURL.origin)) &&
      isFullURL(source));

  const href =
    crossorigin && baseURL ? source.slice(baseURL.origin.length) : source;

  return {
    rel: type === 'module' ? 'modulepreload' : 'preload',
    href,
    integrity,
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

const HTTP_URL_REGEX = /^https?:[/][/]/;

function isFullURL(url: string) {
  return HTTP_URL_REGEX.test(url);
}
