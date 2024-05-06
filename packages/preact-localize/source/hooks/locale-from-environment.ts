import {parseAcceptLanguageHeader} from '@quilted/localize';
import {useBrowserDetails} from '@quilted/preact-browser';

export function useLocaleFromEnvironment() {
  if (typeof navigator === 'object' && navigator.language) {
    return navigator.language;
  }

  const browserDetails = useBrowserDetails({optional: true});

  const acceptLanguage =
    browserDetails?.request.headers?.get('Accept-Language');

  return acceptLanguage && parseAcceptLanguageHeader(acceptLanguage);
}
