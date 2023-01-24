// These libraries ship with the browser export condition targeting ESM. This breaks Jest,
// because it prefers the browser condition but does not understand ESM yet. This deletes the
// offending package.json fields so that the CommonJS variants are preferred.
//
// @see https://github.com/microsoft/accessibility-insights-web/pull/5421#issuecomment-1109168149
const PACKAGES_WITH_ESM_BROWSER_ENTRIES = new Set([
  '@remix-run/web-fetch',
  '@remix-run/web-blob',
  '@remix-run/web-stream',
  '@remix-run/web-form-data',
  '@web3-storage/multipart-parser',
  'preact',
  '@preact/signals',
  '@preact/signals-core',
]);

module.exports = (path, options) => {
  // Call the defaultResolver, so we leverage its cache, error handling, etc.
  return options.defaultResolver(path, {
    ...options,
    // Use packageFilter to process parsed `package.json` before the resolution (see https://www.npmjs.com/package/resolve#resolveid-opts-cb)
    packageFilter: (pkg) => {
      if (PACKAGES_WITH_ESM_BROWSER_ENTRIES.has(pkg.name)) {
        delete pkg['exports'];
        delete pkg['module'];
      }

      return pkg;
    },
  });
};
