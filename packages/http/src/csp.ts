export enum CspDirective {
  // Fetch directives
  ChildSrc = 'child-src',
  ConnectSrc = 'connect-src',
  DefaultSrc = 'default-src',
  FontSrc = 'font-src',
  FrameSrc = 'frame-src',
  ImgSrc = 'img-src',
  ManifestSrc = 'manifest-src',
  MediaSrc = 'media-src',
  ObjectSrc = 'object-src',
  PrefetchSrc = 'prefetch-src',
  ScriptSrc = 'script-src',
  StyleSrc = 'style-src',
  WebrtcSrc = 'webrtc-src',
  WorkerSrc = 'worker-src',

  // Document directives
  BaseUri = 'base-uri',
  PluginTypes = 'plugin-types',
  Sandbox = 'sandbox',

  // Navigation directives
  FormAction = 'form-action',
  FrameAncestors = 'frame-ancestors',

  // Reporting directives
  ReportUri = 'report-uri',

  // Other directives
  BlockAllMixedContent = 'block-all-mixed-content',
  RequireSriFor = 'require-sri-for',
  UpgradeInsecureRequests = 'upgrade-insecure-requests',
}

export enum CspSandboxAllow {
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

export enum CspSpecialSource {
  Any = '*',
  Self = "'self'",
  UnsafeInline = "'unsafe-inline'",
  UnsafeEval = "'unsafe-eval'",
  None = "'none'",
  StrictDynamic = "'strict-dynamic'",
  ReportSample = "'report-sample'",
  Data = 'data:',
  Blob = 'blob:',
  FileSystem = 'filesystem:',
}
