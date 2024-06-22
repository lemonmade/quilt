import {RouterContext} from '../context.ts';

export function useCurrentURL() {
  return RouterContext.use().currentRequest.url;
}
