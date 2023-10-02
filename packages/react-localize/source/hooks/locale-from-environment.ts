import {parseAcceptLanguageHeader} from '@quilted/localize';
import {useHttpManager} from '@quilted/react-http';

export function useLocaleFromEnvironment() {
  const acceptLanguage = useHttpManager()?.headers?.get('Accept-Language');

  return acceptLanguage
    ? parseAcceptLanguageHeader(acceptLanguage)
    : typeof navigator === 'object'
    ? navigator.language
    : undefined;
}
