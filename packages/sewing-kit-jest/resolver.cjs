const enhancedResolve = require('enhanced-resolve');

const resolve = enhancedResolve.create.sync({
  conditionNames: [
    // 'sewing-kit:esnext',
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
