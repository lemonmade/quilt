import {useQuiltContext} from '@quilted/preact-context';

export function useCurrentURL() {
  return useQuiltContext('navigation').currentRequest.url;
}
