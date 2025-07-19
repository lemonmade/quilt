import type {
  ContentSecurityPolicySandboxAllow,
  ContentSecurityPolicySpecialSource,
} from '@quilted/http';

export type {
  ContentSecurityPolicySandboxAllow,
  ContentSecurityPolicySpecialSource,
  ContentSecurityPolicyDirective,
  CrossOriginEmbedderPolicyHeaderValue,
  CrossOriginOpenerPolicyHeaderValue,
  CrossOriginResourcePolicyHeaderValue,
  PermissionsPolicyDirective,
  PermissionsPolicySpecialSource,
} from '@quilted/http';

const SPECIAL_SOURCES = new Set(['*', 'self', 'src']);

// The recommendation for being added to Google’s preload list is
// two years. See https://hstspreload.org/ for details.
const STRICT_TRANSPORT_SECURITY_DEFAULT_MAX_AGE = 63_072_000;

/**
 * Options for controlling the Cache-Control header of the current
 * response.
 *
 * @see https://csswizardry.com/2019/03/cache-control-for-civilians/
 */
export type CacheControlHeaderOptions =
  | {
      /**
       * Whether this cache control directive applies only to “private”
       * caches, which is typically the end user’s browser cache for
       * applications using Quilt. When not set, the cache-control directive
       * will be set to `public`, which allows all caches (including CDNs,
       * proxies, and the like) to cache the content.
       */
      private?: boolean;
      /**
       * Completely disable caching of this response. Passing this option
       * sets the `Cache-Control` header to `no-store`.
       */
      cache: false;
      maxAge?: never;
      immutable?: never;
      revalidate?: never;
    }
  | {
      /**
       * Whether this cache control directive applies only to “private”
       * caches, which is typically the end user’s browser cache for
       * applications using Quilt. When not set, the cache-control directive
       * will be set to `public`, which allows all caches (including CDNs,
       * proxies, and the like) to cache the content.
       */
      private?: boolean;
      cache?: never;
      /**
       * The number of seconds, from the time of this request, that
       * the content is considered “fresh”.
       */
      maxAge?: number;
      immutable?: never;
      /**
       * Controls how clients should revalidate their cached content.
       * If this option is set to `true`, the resulting `Cache-Control`
       * header will have the `must-revalidate` directive, which asks
       * clients to revalidate their content after the `maxAge` period
       * has expired.
       *
       * If you instead pass `{allowStale: number}`, the resulting
       * `Cache-Control` header will have the `stale-while-revalidate`
       * directive, which allows caches that support it to use the stale
       * version from the cache while they perform revalidation in the
       * background.
       */
      revalidate?: boolean | {allowStale: number};
    }
  | {
      /**
       * Whether this cache control directive applies only to “private”
       * caches, which is typically the end user’s browser cache for
       * applications using Quilt. When not set, the cache-control directive
       * will be set to `public`, which allows all caches (including CDNs,
       * proxies, and the like) to cache the content.
       */
      private?: boolean;
      cache?: never;
      maxAge?: number;
      /**
       * Declares that this request is immutable. This means that it is
       * assumed to never change, and clients will never attempt to
       * revalidate the content. Be careful when using this option!
       */
      immutable?: boolean;
      revalidate?: never;
    };

/**
 * A helper class for creating `Cache-Control` headers.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control
 */
export class CacheControlHeader {
  /**
   * Creates a `Cache-Control` header from the provided options.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control
   * @example
   * ```ts
   * const header = CacheControlHeader.stringify({
   *   immutable: true,
   * });
   */
  static stringify(options: CacheControlHeaderOptions) {
    return new CacheControlHeader(options).toString();
  }

  readonly private: boolean;
  readonly cache: boolean;
  readonly immutable: boolean;
  readonly maxAge?: number;
  readonly revalidate: boolean | {allowStale: number};
  readonly #headerValue: string;

  constructor({
    private: isPrivate = false,
    cache = false,
    immutable = false,
    maxAge = immutable ? 31536000 : undefined,
    revalidate = false,
  }: CacheControlHeaderOptions) {
    this.private = isPrivate;
    this.cache = cache;
    this.immutable = immutable;
    this.maxAge = maxAge;
    this.revalidate = revalidate;

    let headerValue = '';

    headerValue = isPrivate ? 'private' : 'public';

    const appendToHeader = (value: string) => {
      headerValue = `${headerValue}, ${value}`;
    };

    if (cache === false) {
      appendToHeader('no-store');
    }

    if (maxAge === 0 && revalidate === true) {
      appendToHeader('no-cache');
    } else if (typeof maxAge === 'number' || revalidate) {
      appendToHeader(`max-age=${maxAge ?? 0}`);

      if (revalidate === true) {
        appendToHeader('must-revalidate');
      } else if (typeof revalidate === 'object') {
        appendToHeader(`stale-while-revalidate=${revalidate.allowStale}`);
      }
    }

    if (immutable) appendToHeader('immutable');

    this.#headerValue = headerValue;
  }

  toString() {
    return this.#headerValue;
  }
}

/**
 * Options for creating a content security policy.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy
 */
export interface ContentSecurityPolicyHeaderOptions {
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

/**
 * A helper class for creating `Content-Security-Policy` headers.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy
 */
export class ContentSecurityPolicyHeader {
  /**
   * Creates a `Content-Security-Policy` header from the provided options.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy
   * @example
   * ```ts
   * const header = ContentSecurityPolicyHeader.stringify({
   *   defaultSources: ["'self'"],
   * });
   */
  static stringify(options: ContentSecurityPolicyHeaderOptions = {}) {
    return new ContentSecurityPolicyHeader(options).toString();
  }

  readonly #headerValue: string;

  constructor(options: ContentSecurityPolicyHeaderOptions = {}) {
    let headerValue = '';

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
    } = options;

    const appendContent = (content: string) => {
      if (headerValue.length === 0) {
        headerValue = content;
      } else {
        headerValue += `; ${content}`;
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
    addSourcesDirective('img-src', imageSources);
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

    this.#headerValue = headerValue;
  }

  toString() {
    return this.#headerValue;
  }
}

import type {PermissionsPolicySpecialSource} from '@quilted/http';

/**
 * Options for creating a permissions policy.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Permissions-Policy
 */
export interface PermissionsPolicyHeaderOptions {
  /**
   * Controls whether the current document is allowed to gather information about the acceleration of
   * the device through the Accelerometer interface.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Feature-Policy/accelerometer
   */
  accelerometer?: false | (PermissionsPolicySpecialSource | string)[];

  /**
   * Controls whether the current document is allowed to gather information
   * about the amount of light in the environment around the device through
   * the AmbientLightSensor interface.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Feature-Policy/ambient-light-sensor
   */
  ambientLightSensor?: false | (PermissionsPolicySpecialSource | string)[];

  /**
   * Controls whether the current document is allowed to autoplay media requested through the
   * HTMLMediaElement interface. This includes both the use of the `autoplay`
   * attribute on `<video>` and `<audio>` elements, and the `HTMLMediaElement.play()`
   * method.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Feature-Policy/autoplay
   */
  autoplay?: false | (PermissionsPolicySpecialSource | string)[];

  /**
   * Controls whether the current document is allowed to use video input devices.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Feature-Policy/camera
   */
  camera?: false | (PermissionsPolicySpecialSource | string)[];

  /**
   * Controls whether or not the current document is permitted to use the
   * `getDisplayMedia()` method to capture screen contents.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Feature-Policy/display-capture
   */
  displayCapture?: false | (PermissionsPolicySpecialSource | string)[];

  /**
   * Controls whether the current document is allowed to set document.domain.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Feature-Policy/document-domain
   */
  documentDomain?: false | (PermissionsPolicySpecialSource | string)[];

  /**
   * Controls whether the current document is allowed to use the Encrypted
   * Media Extensions API (EME).
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Feature-Policy/encrypted-media
   */
  encryptedMedia?: false | (PermissionsPolicySpecialSource | string)[];

  /**
   * Controls whether tasks should execute in frames while they're not being
   * rendered (e.g. if an iframe is hidden or display: none).
   */
  executionWhileNotRendered?:
    | false
    | (PermissionsPolicySpecialSource | string)[];

  /**
   * Controls whether tasks should execute in frames while they're outside of
   * the visible viewport.
   */
  executionWhileOutOfViewport?:
    | false
    | (PermissionsPolicySpecialSource | string)[];

  /**
   * Controls whether the current document is allowed to use
   * `Element.requestFullScreen()`.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Feature-Policy/fullscreen
   */
  fullScreen?: false | (PermissionsPolicySpecialSource | string)[];

  /**
   * Controls whether the current document is allowed to use the Gamepad API.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Feature-Policy/gamepad
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API
   */
  gamepad?: false | (PermissionsPolicySpecialSource | string)[];

  /**
   * Controls whether the current document is allowed to use the
   * Geolocation Interface.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Feature-Policy/geolocation
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Geolocation
   */
  geolocation?: false | (PermissionsPolicySpecialSource | string)[];

  /**
   * Controls whether the current document is allowed to gather information
   * about the orientation of the device through the Gyroscope interface.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Feature-Policy/gyroscope
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Gyroscope
   */
  gyroscope?: false | (PermissionsPolicySpecialSource | string)[];

  /**
   * Controls whether the user will be tracked and categorized using Google’s
   * “Federated Learning of Cohorts” initiative.
   *
   * @default false
   * @see https://www.eff.org/deeplinks/2021/03/googles-floc-terrible-idea
   */
  interestCohort?: false | (PermissionsPolicySpecialSource | string)[];

  /**
   * Controls whether the current document is allowed to gather information
   * about the orientation of the device through the Magnetometer interface.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Feature-Policy/magnetometer
   */
  magnetometer?: false | (PermissionsPolicySpecialSource | string)[];

  /**
   * Controls whether the current document is allowed to use audio input devices.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Feature-Policy/microphone
   */
  microphone?: false | (PermissionsPolicySpecialSource | string)[];

  /**
   * Controls whether the current document is allowed to use the Web MIDI API.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Feature-Policy/midi
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Web_MIDI_API
   */
  midi?: false | (PermissionsPolicySpecialSource | string)[];

  /**
   * Controls the availability of mechanisms that enables the page author
   * to take control over the behavior of spatial navigation, or to cancel
   * it outright.
   */
  navigationOverride?: false | (PermissionsPolicySpecialSource | string)[];

  /**
   * Controls whether the current document is allowed to use the Payment Request API.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Feature-Policy/payment
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Payment_Request_API
   */
  payment?: false | (PermissionsPolicySpecialSource | string)[];

  /**
   * Controls whether the current document is allowed to play a video in a Picture-in-Picture mode.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Feature-Policy/picture-in-picture
   */
  pictureInPicture?: false | (PermissionsPolicySpecialSource | string)[];

  /**
   * Controls whether the current document is allowed to use the Web
   * Authentication API to retrieve already stored public-key credentials.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Feature-Policy/publickey-credentials-get
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API
   */
  publicKeyCredentialsGet?: false | (PermissionsPolicySpecialSource | string)[];

  /**
   * Controls whether the current document is allowed to make synchronous XMLHttpRequest requests.
   *
   * @default false
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Feature-Policy/sync-xhr
   */
  syncXhr?: false | (PermissionsPolicySpecialSource | string)[];

  /**
   * Controls whether the current document is allowed to use the WebUSB API.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Feature-Policy/usb
   * @see https://wicg.github.io/webusb/
   */
  usb?: false | (PermissionsPolicySpecialSource | string)[];

  /**
   * Controls whether or not the current document is allowed to use the
   * `Navigator.share()` API to share text, links, images, and other content
   * to arbitrary destinations of user's choice.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Feature-Policy/web-share
   */
  webShare?: false | (PermissionsPolicySpecialSource | string)[];

  /**
   * Controls whether or not the current document is allowed to use the WebXR
   * Device API to interact with a WebXR session.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Feature-Policy/xr-spatial-tracking
   * @see https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API
   */
  xrSpatialTracking?: false | (PermissionsPolicySpecialSource | string)[];
}

/**
 * A helper class for creating `Permissions-Policy` headers.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Permissions-Policy
 */
export class PermissionsPolicyHeader {
  /**
   * Creates a `Permissions-Policy` header from the provided options.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Permissions-Policy
   * @example
   * ```ts
   * const header = PermissionsPolicyHeader.stringify({
   *   camera: false,
   *   microphone: false,
   * });
   */
  static stringify(options: PermissionsPolicyHeaderOptions) {
    return new PermissionsPolicyHeader(options).toString();
  }

  readonly #headerValue: string;

  constructor(options: PermissionsPolicyHeaderOptions) {
    let headerValue = '';

    const {
      accelerometer,
      ambientLightSensor,
      autoplay,
      camera,
      displayCapture,
      documentDomain,
      encryptedMedia,
      executionWhileNotRendered,
      executionWhileOutOfViewport,
      fullScreen,
      gamepad,
      geolocation,
      gyroscope,
      interestCohort = false,
      magnetometer,
      microphone,
      midi,
      navigationOverride,
      payment,
      pictureInPicture,
      publicKeyCredentialsGet,
      syncXhr = false,
      usb,
      webShare,
      xrSpatialTracking,
    } = options;

    const addDirective = (directive: string, value?: boolean | string[]) => {
      if (value == null) return;

      if (headerValue.length !== 0) headerValue += ', ';

      if (value === false) {
        headerValue += `${directive}=()`;
      } else if (Array.isArray(value)) {
        if (value.length === 0) {
          headerValue += `${directive}=()`;
        } else {
          headerValue += `${directive}=(${value
            .map((value) =>
              SPECIAL_SOURCES.has(value) ? value : JSON.stringify(value),
            )
            .join(' ')})`;
        }
      }
    };

    addDirective('interest-cohort', interestCohort);
    addDirective('accelerometer', accelerometer);
    addDirective('ambient-light-sensor', ambientLightSensor);
    addDirective('autoplay', autoplay);
    addDirective('camera', camera);
    addDirective('display-capture', displayCapture);
    addDirective('document-domain', documentDomain);
    addDirective('encrypted-media', encryptedMedia);
    addDirective('execution-while-not-rendered', executionWhileNotRendered);
    addDirective(
      'execution-while-out-of-viewport',
      executionWhileOutOfViewport,
    );
    addDirective('fullscreen', fullScreen);
    addDirective('gamepad', gamepad);
    addDirective('geolocation', geolocation);
    addDirective('gyroscope', gyroscope);
    addDirective('interest-cohort', interestCohort);
    addDirective('magnetometer', magnetometer);
    addDirective('microphone', microphone);
    addDirective('midi', midi);
    addDirective('navigation-override', navigationOverride);
    addDirective('payment', payment);
    addDirective('picture-in-picture', pictureInPicture);
    addDirective('publickey-credentials-get', publicKeyCredentialsGet);
    addDirective('sync-xhr', syncXhr);
    addDirective('usb', usb);
    addDirective('web-share', webShare);
    addDirective('xr-spatial-tracking', xrSpatialTracking);

    this.#headerValue = headerValue;
  }

  toString() {
    return this.#headerValue;
  }
}

/**
 * Options for creating a content security policy.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security
 */
export interface StrictTransportSecurityHeaderOptions {
  /**
   * The time, in seconds, that the browser should remember that a site is only to
   * be accessed using HTTPS.
   *
   * @default 63_072_000
   */
  maxAge?: number;

  /**
   * Applies this rule to all of the site’s subdomains.
   *
   * @default true
   */
  includeSubDomains?: boolean;

  /**
   * Allows this site to be added to an HSTS preload service,
   * which browsers can use to determine ahead of time what sites
   * should default to being accessed via HTTPS.
   *
   * @default true
   */
  preload?: boolean;
}

/**
 * A helper class for creating `Strict-Transport-Security` headers.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security
 */
export class StrictTransportSecurityHeader {
  /**
   * Creates a `Strict-Transport-Security` header from the provided options.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security
   * @example
   * ```ts
   * const header = StrictTransportSecurityHeader.stringify({
   *   maxAge: 31536000,
   * });
   */
  static stringify(options: StrictTransportSecurityHeaderOptions = {}) {
    return new StrictTransportSecurityHeader(options).toString();
  }

  readonly maxAge: number;
  readonly includeSubDomains: boolean;
  readonly preload: boolean;
  readonly #headerValue: string;

  constructor(options: StrictTransportSecurityHeaderOptions = {}) {
    const {
      maxAge = STRICT_TRANSPORT_SECURITY_DEFAULT_MAX_AGE,
      includeSubDomains = true,
      preload = true,
    } = options;

    this.maxAge = maxAge;
    this.includeSubDomains = includeSubDomains;
    this.preload = preload;

    let headerValue = String(maxAge);

    if (includeSubDomains) headerValue += `; includeSubDomains`;
    if (preload) headerValue += `; preload`;

    this.#headerValue = headerValue;
  }

  toString() {
    return this.#headerValue;
  }
}
