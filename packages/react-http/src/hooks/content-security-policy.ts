import type {
  ContentSecurityPolicySandboxAllow,
  ContentSecurityPolicySpecialSource,
} from '@quilted/http';

import {useHttpAction} from './http-action';

/**
 * Options for creating a content security policy.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy
 */
export interface ContentSecurityPolicyOptions {
  /**
   * Sets the child-src content security policy directive, which determines what sources
   * are allowed for nested browsing contexts, including workers and iframes.
   *
   * Passing `false` or an empty array is equivalent to passing `["'none'"]`, disallowing
   * all sources.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/child-src
   */
  childSources?: false | (ContentSecurityPolicySpecialSource | string)[];

  /**
   * Sets the connect-src content security policy directive, which determines what sources
   * can be connected to from script sources (for example, when using `fetch()`).
   *
   * Passing `false` or an empty array is equivalent to passing `["'none'"]`, disallowing
   * all sources.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/connect-src
   */
  connectSources?: (ContentSecurityPolicySpecialSource | string)[];

  /**
   * Sets the default-src content security policy directive, which determines what sources
   * are allowed for resources where a more specific policy has not been set.
   *
   * Passing `false` or an empty array is equivalent to passing `["'none'"]`, disallowing
   * all sources.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/default-src
   */
  defaultSources?: false | (ContentSecurityPolicySpecialSource | string)[];

  /**
   * Sets the font-src content security policy directive, which determines what sources
   * are allowed for fonts used on this page.
   *
   * Passing `false` or an empty array is equivalent to passing `["'none'"]`, disallowing
   * all sources.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/font-src
   */
  fontSources?: false | (ContentSecurityPolicySpecialSource | string)[];

  /**
   * Sets the frame-src content security policy directive, which determines what sources
   * are allowed for frames embedded in this page.
   *
   * Passing `false` or an empty array is equivalent to passing `["'none'"]`, disallowing
   * all sources.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/frame-src
   */
  frameSources?: false | (ContentSecurityPolicySpecialSource | string)[];

  /**
   * Sets the img-src content security policy directive, which determines what sources
   * are allowed for images.
   *
   * Passing `false` or an empty array is equivalent to passing `["'none'"]`, disallowing
   * all sources.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/img-src
   */
  imageSources?: false | (ContentSecurityPolicySpecialSource | string)[];

  /**
   * Sets the manifest-src content security policy directive, which determines what sources
   * are allowed for the app manifest for this page.
   *
   * Passing `false` or an empty array is equivalent to passing `["'none'"]`, disallowing
   * all sources.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/manifest-src
   */
  manifestSources?: false | (ContentSecurityPolicySpecialSource | string)[];

  /**
   * Sets the media-src content security policy directive, which determines what sources
   * are allowed for audio and video.
   *
   * Passing `false` or an empty array is equivalent to passing `["'none'"]`, disallowing
   * all sources.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/media-src
   */
  mediaSources?: false | (ContentSecurityPolicySpecialSource | string)[];

  /**
   * Sets the object-src content security policy directive, which determines what sources
   * are allowed for `<object>`, `<embed>`, and `<applet>` elements.
   *
   * Passing `false` or an empty array is equivalent to passing `["'none'"]`, disallowing
   * all sources.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/object-src
   */
  objectSources?: false | (ContentSecurityPolicySpecialSource | string)[];

  /**
   * Sets the prefetch-src content security policy directive, which determines what sources
   * are allowed for prefetching and prerendering.
   *
   * Passing `false` or an empty array is equivalent to passing `["'none'"]`, disallowing
   * all sources.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/prefetch-src
   */
  prefetchSources?: false | (ContentSecurityPolicySpecialSource | string)[];

  /**
   * Sets the script-src content security policy directive, which determines what sources
   * are allowed for scripts.
   *
   * Passing `false` or an empty array is equivalent to passing `["'none'"]`, disallowing
   * all sources.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/script-src
   */
  scriptSources?: false | (ContentSecurityPolicySpecialSource | string)[];

  /**
   * Sets the script-src-elem content security policy directive, which determines what sources
   * are allowed for `script` elements.
   *
   * Passing `false` or an empty array is equivalent to passing `["'none'"]`, disallowing
   * all sources.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/script-src-elem
   */
  scriptElementSources?:
    | false
    | (ContentSecurityPolicySpecialSource | string)[];

  /**
   * Sets the script-src-attr content security policy directive, which determines what sources
   * are allowed for inline event handlers.
   *
   * Passing `false` or an empty array is equivalent to passing `["'none'"]`, disallowing
   * all sources.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/script-src-attr
   */
  scriptAttributeSources?:
    | false
    | (ContentSecurityPolicySpecialSource | string)[];

  /**
   * Sets the style-src content security policy directive, which determines what sources
   * are allowed for stylesheets.
   *
   * Passing `false` or an empty array is equivalent to passing `["'none'"]`, disallowing
   * all sources.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/style-src
   */
  styleSources?: false | (ContentSecurityPolicySpecialSource | string)[];

  /**
   * Sets the style-src-elem content security policy directive, which determines what sources
   * are allowed for stylesheet elements.
   *
   * Passing `false` or an empty array is equivalent to passing `["'none'"]`, disallowing
   * all sources.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/style-src-elem
   */
  styleElementSources?: false | (ContentSecurityPolicySpecialSource | string)[];

  /**
   * Sets the style-src-attr content security policy directive, which determines what sources
   * are allowed for inline styles.
   *
   * Passing `false` or an empty array is equivalent to passing `["'none'"]`, disallowing
   * all sources.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/style-src-attr
   */
  styleAttributeSources?:
    | false
    | (ContentSecurityPolicySpecialSource | string)[];

  /**
   * Sets the worker-src content security policy directive, which determines what sources
   * are allowed for workers created by this page.
   *
   * Passing `false` or an empty array is equivalent to passing `["'none'"]`, disallowing
   * all sources.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/worker-src
   */
  workerSources?: false | (ContentSecurityPolicySpecialSource | string)[];

  /**
   * Sets the base-uri content security policy directive, which determines the sources that can
   * be used in the document’s `<base>` element.
   *
   * Passing `false` or an empty array is equivalent to passing `["'none'"]`, disallowing
   * all sources.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/base-uri
   */
  baseUri?: false | (ContentSecurityPolicySpecialSource | string)[];

  /**
   * Apply restrictions to the abilities of this HTML page using the `sandbox`
   * content security policy directive. When set to `true`, the `sandbox` header
   * is set without any exceptions. You can also pass an allow-list of capabilities
   * to this option to apply the sandbox, with some features enabled.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/sandbox
   */
  sandbox?: boolean | ContentSecurityPolicySandboxAllow[];

  /**
   * Sets the form-action content security policy directive, which determines the sources
   * that can be the targets of form submissions on this page.
   *
   * Passing `false` or an empty array is equivalent to passing `["'none'"]`, disallowing
   * all sources.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/form-action
   */
  formActions?:
    | false
    | (
        | ContentSecurityPolicySpecialSource.Self
        | ContentSecurityPolicySpecialSource.UnsafeEval
        | ContentSecurityPolicySpecialSource.UnsafeHashes
        | ContentSecurityPolicySpecialSource.UnsafeInline
        | ContentSecurityPolicySpecialSource.None
        | string
      )[];

  /**
   * Sets the frame-ancestors content security policy directive, which determines what sources
   * can embed this page.
   *
   * Passing `false` or an empty array is equivalent to passing `["'none'"]`, disallowing
   * all sources.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/frame-ancestors
   */
  frameAncestors?:
    | false
    | (
        | ContentSecurityPolicySpecialSource.Self
        | ContentSecurityPolicySpecialSource.None
        | string
      )[];

  /**
   * Sets the navigate-to content security policy directive, which determines what
   * sources the page can navigate to.
   *
   * Passing `false` or an empty array is equivalent to passing `["'none'"]`, disallowing
   * all sources.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/navigate-to
   */
  navigateTo?: false | (ContentSecurityPolicySpecialSource | string)[];

  /**
   * Sets the report-uri content security policy directive which controls the URL
   * the browser will report to when content security policy violations occur.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/navigate-to
   */
  reportUri?: string;

  /**
   * Sets the `report-to` group that the browser will report content security
   * policy violations to. You will typically need to use this in conjunction
   * with setting the `Report-To` header, using either `useResponseHeader()` or
   * `<ResponseHeader />`.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/report-to
   */
  reportTo?: string;

  /**
   * Sets the `block-all-mixed-content` content security policy directive, which
   * prevents insecure content from loading on when the page uses HTTP.
   *
   * @deprecated Use the `upgradeInsecureRequests` option instead.
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/block-all-mixed-content
   */
  blockAllMixedContent?: boolean;

  /**
   * Instructs the browser to upgrade any insecure requests made by the page as
   * if they had been secure requests.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/upgrade-insecure-requests
   */
  upgradeInsecureRequests?: boolean;

  /**
   * Determines what resources the browser will require sub-resource integrity (SRI)
   * checks before loading.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/require-sri-for
   */
  requireSriFor?: ('style' | 'script')[];

  /**
   * Determines what resources will only accept “trusted types” in potential XSS
   * vectors, like when setting `Element.innerHTML`.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/require-trusted-types-for
   */
  requireTrustedTypesFor?: 'script'[];
}

export function useContentSecurityPolicy(
  value: string | ContentSecurityPolicyOptions,
) {
  useHttpAction((http) => {
    let normalizedValue = '';

    if (typeof value === 'string') {
      normalizedValue = value;
    } else {
      const {
        baseUri,
        blockAllMixedContent,
        childSources,
        connectSources,
        defaultSources,
        fontSources,
        formActions,
        frameAncestors,
        frameSources,
        imageSources,
        manifestSources,
        mediaSources,
        navigateTo,
        objectSources,
        prefetchSources,
        reportTo,
        reportUri,
        requireSriFor,
        requireTrustedTypesFor,
        sandbox,
        scriptAttributeSources,
        scriptElementSources,
        scriptSources,
        styleAttributeSources,
        styleElementSources,
        styleSources,
        upgradeInsecureRequests,
        workerSources,
      } = value;

      const appendContent = (content: string) => {
        if (normalizedValue.length === 0) {
          normalizedValue = content;
        } else {
          normalizedValue += `; ${content}`;
        }
      };

      const addDirective = (directive: string, value?: string) =>
        appendContent(`${directive}${value ? ` ${value}` : ''}`);

      const addSourcesDirective = (
        directive: string,
        value?: boolean | string[],
      ) => {
        if (value == null) return;

        if (value === false) {
          addDirective(directive, "'none'");
        } else if (Array.isArray(value)) {
          if (value.length === 0) {
            addDirective(directive, "'none'");
          } else {
            addDirective(directive, value.join(' '));
          }
        }
      };

      addSourcesDirective('default-src', defaultSources);
      addSourcesDirective('connect-src', connectSources);
      addSourcesDirective('child-src', childSources);
      addSourcesDirective('font-src', fontSources);
      addSourcesDirective('form-action', formActions);
      addSourcesDirective('frame-ancestors', frameAncestors);
      addSourcesDirective('frame-src', frameSources);
      addSourcesDirective('image-src', imageSources);
      addSourcesDirective('manifest-src', manifestSources);
      addSourcesDirective('media-src', mediaSources);
      addSourcesDirective('object-src', objectSources);
      addSourcesDirective('prefetch-src', prefetchSources);
      addSourcesDirective('script-src', scriptSources);
      addSourcesDirective('script-src-attr', scriptAttributeSources);
      addSourcesDirective('script-src-elem', scriptElementSources);
      addSourcesDirective('style-src', styleSources);
      addSourcesDirective('style-src-attr', styleAttributeSources);
      addSourcesDirective('style-src-elem', styleElementSources);
      addSourcesDirective('worker-src', workerSources);

      addSourcesDirective('base-uri', baseUri);
      addSourcesDirective('navigate-to', navigateTo);

      if (sandbox === true) {
        addDirective('sandbox');
      } else if (Array.isArray(sandbox)) {
        if (sandbox.length === 0) {
          addDirective('sandbox');
        } else {
          addDirective('sandbox', sandbox.join(' '));
        }
      }

      if (requireSriFor && requireSriFor.length > 0) {
        addDirective('require-sri-for', requireSriFor.join(' '));
      }

      if (requireTrustedTypesFor && requireTrustedTypesFor.length > 0) {
        addDirective(
          'require-trusted-types-for',
          requireTrustedTypesFor.map((type) => `'${type}'`).join(' '),
        );
      }

      if (blockAllMixedContent) addDirective('block-all-mixed-content');
      if (upgradeInsecureRequests) addDirective('upgrade-insecure-requests');

      if (reportTo) addDirective('report-to', reportTo);
      if (reportUri) addDirective('report-uri', reportUri);
    }

    if (normalizedValue.length > 0) {
      http.responseHeaders.append('Content-Security-Policy', normalizedValue);
    }
  });
}
