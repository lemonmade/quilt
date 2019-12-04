const cached = require('glob').sync('.sewing-kit/cache/typescript/**/*', {
  absolute: true,
});

const reactHtml = cached.find((cachedFile) =>
  /react-html.*tsconfig/.test(cachedFile),
);

console.log(
  cached,
  reactHtml,
  require('fs').statSync(reactHtml),
  require('fs').statSync(
    require('path').resolve(
      process.env.PWD,
      'packages/react-html/src/index.ts',
    ),
  ),
);
