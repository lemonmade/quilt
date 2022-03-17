import {resolveUrl as baseResolveUrl} from '@quilted/routing';
import type {RelativeTo} from '@quilted/routing';

import type {Request, NavigateTo} from './types';

export function resolveTo(
  to: NavigateTo,
  {request, relativeTo}: {request?: Request; relativeTo?: RelativeTo} = {},
) {
  let resolvedLocation: string;

  if (request == null) {
    if (typeof to === 'string') {
      resolvedLocation = to;
    } else if (to instanceof URL) {
      resolvedLocation = to.href;
    } else {
      throw new Error(
        `Can’t resolve ${JSON.stringify(
          to,
        )}. You must provide a \`request\` option to indicate the base URL to resolve from.`,
      );
    }
  } else {
    resolvedLocation = baseResolveUrl(to, request.url as any, relativeTo).href;
  }

  return resolvedLocation;
}
