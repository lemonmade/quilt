// Jest’s support for ESM is a bit of a mess. It doesn’t support
// export maps, which we use to declare all the multi-entry packages
// in quilt. It has some native support for ESM, but I had a lot of
// issues with it. It technically supports transpiling ESM in node_modules
// to CommonJS, but it is very difficult to do so because you have to create
// a regular expression that prevents some subset of node_modules from being
// ignored by transformers.
//
// After some thought, I am just solving one part of this for now:
// support for export maps. This custom resolver lets the entries in Quilt
// and other export map packages be resolved by Jest. Unfortunately, if those
// packages are ESM-only, they will not work; for Quilt, I added a `require`
// export condition to all packages that might be imported in tests that
// points to a CommonJS build.
//
// See https://github.com/facebook/jest/issues/9771 for details on this approach.

const enhancedResolve = require('enhanced-resolve');

const resolve = enhancedResolve.create.sync({
  conditionNames: [
    // 'quilt:esnext',
    // 'esnext',
    // 'import',
    'require',
    'default',
    'node',
  ],
  mainFields: [
    // 'module',
    'main',
  ],
  extensions: ['.ts', '.tsx', '.js', '.mjs', '.json', '.node'],
});

module.exports = function resolver(request, options) {
  return resolve(options.basedir, request);
};
