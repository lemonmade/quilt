import {useBrowserDetails} from '../../../context.ts';

export function useResolvedBaseURL(baseURL?: string | URL) {
  const urlFromContext = useBrowserDetails({optional: true})?.request.url;
  const resolvedURL = baseURL ?? urlFromContext;
  return typeof resolvedURL === 'string' ? new URL(resolvedURL) : resolvedURL;
}
