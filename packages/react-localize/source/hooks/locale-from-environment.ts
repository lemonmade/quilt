import {parseAcceptLanguageHeader} from '@quilted/localize';
import {useRequestHeader} from '@quilted/react-http';

export function useLocaleFromEnvironment() {
  const acceptLanguage = useRequestHeader('Accept-Language');

  return acceptLanguage
    ? parseAcceptLanguageHeader(acceptLanguage)
    : typeof navigator === 'object'
    ? navigator.language
    : undefined;
}
