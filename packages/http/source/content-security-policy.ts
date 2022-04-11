/**
 * Provides friendly names for the content security policy “directives”,
 * which are the fields that allow you to control the policy’s behavior.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy#directives
 */
export enum ContentSecurityPolicyDirective {
  // Fetch directives

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/child-src
   */
  ChildSource = 'child-src',

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/connect-src
   */
  ConnectSource = 'connect-src',

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/default-src
   */
  DefaultSource = 'default-src',

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/font-src
   */
  FontSource = 'font-src',

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/frame-src
   */
  FrameSource = 'frame-src',

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/img-src
   */
  ImageSource = 'img-src',

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/manifest-src
   */
  ManifestSource = 'manifest-src',

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/media-src
   */
  MediaSource = 'media-src',

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/object-src
   */
  ObjectSource = 'object-src',

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/prefetch-src
   */
  PrefetchSource = 'prefetch-src',

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/script-src
   */
  ScriptSource = 'script-src',

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/script-src-elem
   */
  ScriptElementSource = 'script-src-elem',

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/script-src-attr
   */
  ScriptAttributeSource = 'script-src-attr',

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/style-src
   */
  StyleSource = 'style-src',

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/style-src-elem
   */
  StyleElementSource = 'style-src-elem',

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/style-src-attr
   */
  StyleAttributeSource = 'style-src-attr',

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/worker-src
   */
  WorkerSource = 'worker-src',

  // Document directives

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/base-uri
   */
  BaseUri = 'base-uri',

  /**
   * @deprecated
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/plugin-types
   */
  PluginTypes = 'plugin-types',

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/sandbox
   */
  Sandbox = 'sandbox',

  // Navigation directives

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/form-action
   */
  FormAction = 'form-action',

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/frame-ancestors
   */
  FrameAncestors = 'frame-ancestors',

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/navigate-to
   */
  NavigateTo = 'navigate-to',

  // Reporting directives

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/report-uri
   */
  ReportUri = 'report-uri',

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/report-to
   */
  ReportTo = 'report-to',

  // Other directives

  /**
   * @deprecated Use `ContentSecurityPolicyDirective.UpgradeInsecureRequests` instead.
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/block-all-mixed-content
   */
  BlockAllMixedContent = 'block-all-mixed-content',

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/upgrade-insecure-requests
   */
  UpgradeInsecureRequests = 'upgrade-insecure-requests',

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/require-sri-for
   */
  RequireSubResourceIntegrityFor = 'require-sri-for',

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/require-trusted-types-for
   */
  RequireTrustedTypesFor = 'require-trusted-types-for',

  /**
   * @deprecated Use the `Referrer-Policy` header instead.
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/referrer
   */
  Referrer = 'referrer',
}

/**
 * The values that are allowed to be sandboxed through the content security
 * policy `sandbox` directive.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/sandbox
 */
export enum ContentSecurityPolicySandboxAllow {
  Forms = 'allow-forms',
  SameOrigin = 'allow-same-origin',
  Scripts = 'allow-scripts',
  Popups = 'allow-popups',
  Modals = 'allow-modals',
  OrientationLock = 'allow-orientation-lock',
  PointerLock = 'allow-pointer-lock',
  Presentation = 'allow-presentation',
  PopupsToEscapeSandbox = 'allow-popups-to-escape-sandbox',
  TopNavigation = 'allow-top-navigation',
}

/**
 * A collection of special sources allowed in the fetch content
 * security policy directives (like `default-src` and `script-src`).
 */
export enum ContentSecurityPolicySpecialSource {
  Any = '*',
  Self = "'self'",
  UnsafeInline = "'unsafe-inline'",
  UnsafeEval = "'unsafe-eval'",
  UnsafeHashes = "'unsafe-hashes'",
  None = "'none'",
  StrictDynamic = "'strict-dynamic'",
  ReportSample = "'report-sample'",
  Data = 'data:',
  Blob = 'blob:',
  FileSystem = 'filesystem:',
}
