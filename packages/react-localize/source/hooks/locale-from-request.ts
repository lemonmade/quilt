import {parseAcceptLanguageHeader} from '@quilted/localize';
import {useRequestHeader} from '@quilted/react-http';

export function useLocaleFromRequestHeaders() {
  const acceptLanguage = useRequestHeader('Accept-Language');
  return acceptLanguage ? parseAcceptLanguageHeader(acceptLanguage) : undefined;
}
