module.exports = (path, options) => {
  // Call the defaultResolver, so we leverage its cache, error handling, etc.
  return options.defaultResolver(path, {
    ...options,
    // Use packageFilter to process parsed `package.json` before the resolution (see https://www.npmjs.com/package/resolve#resolveid-opts-cb)
    packageFilter: (pkg) => {
      // Currently, preact ships packages where the browser export condition targets ESM. This breaks Jest,
      // because it prefers the browser condition but does not understand ESM yet. This deletes the
      // offending package.json fields so that the CommonJS variants are preferred.
      // @see https://github.com/microsoft/accessibility-insights-web/pull/5421#issuecomment-1109168149
      if (pkg.name === 'preact') {
        delete pkg['exports'];
        delete pkg['module'];
      }

      return pkg;
    },
  });
};
