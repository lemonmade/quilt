import {
  permissionsPolicyHeader,
  type PermissionsPolicyOptions,
} from '@quilted/browser/server';
import {useBrowserResponseAction} from './browser-response-action.ts';

/**
 * Sets the `Permissions-Policy` header for this request.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Feature-Policy
 * @see https://w3c.github.io/webappsec-permissions-policy/#permissions-policy-http-header-field
 */
export function usePermissionsPolicy(value: string | PermissionsPolicyOptions) {
  if (typeof document === 'object') return;

  useBrowserResponseAction((response) => {
    let normalizedValue = '';

    if (typeof value === 'string') {
      normalizedValue = value;
    } else {
      normalizedValue = permissionsPolicyHeader(value);
    }

    if (normalizedValue.length > 0) {
      response.headers.append('Permissions-Policy', normalizedValue);
    }
  });
}
