import {
  ContentSecurityPolicyHeader,
  type ContentSecurityPolicyHeaderOptions,
} from '@quilted/browser/server';

import {useBrowserResponseAction} from './browser-response-action.ts';

/**
 * Options for creating a content security policy.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy
 */
export interface UseContentSecurityPolicyOptions
  extends ContentSecurityPolicyHeaderOptions {
  /**
   * Whether the content security policy should be set to “report-only” mode.
   * In this mode, violations of the policy are reported, but content can
   * still be loaded even if it violates one of the directives.
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy-Report-Only
   */
  reportOnly?: boolean;
}

/**
 * Sets the `Content-Security-Policy` header for this request. If a string
 * is passed, it is used directly as the value for the header; otherwise, the
 * first argument is interpreted as an options object that details the
 * various content security policy directives.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy
 */
export function useContentSecurityPolicy(
  value: string | UseContentSecurityPolicyOptions,
) {
  if (typeof document === 'object') return;

  useBrowserResponseAction((response) => {
    let normalizedValue = '';
    let header = 'Content-Security-Policy';

    if (typeof value === 'string') {
      normalizedValue = value;
    } else {
      normalizedValue = ContentSecurityPolicyHeader.stringify(value);

      if (value.reportOnly) {
        header = 'Content-Security-Policy-Report-Only';
      }
    }

    if (normalizedValue.length > 0) {
      response.headers.append(header, normalizedValue);
    }
  });
}
