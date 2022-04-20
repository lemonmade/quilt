// @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept-Language
export function parseAcceptLanguageHeader(header: string) {
  const parsed = header.split(',')[0]!.split(';')[0]!.trim();
  return parsed === '*' ? undefined : parsed;
}
