import {parseAcceptLanguageHeader} from '@quilted/localize';
import {useRequestHeaders} from '@quilted/react-http';

export function useLocaleFromEnvironment() {
  const headers = useRequestHeaders();
  const acceptLanguage = headers?.get('Accept-Language');

  return acceptLanguage
    ? parseAcceptLanguageHeader(acceptLanguage)
    : typeof navigator === 'object'
    ? navigator.language
    : undefined;
}
