import {quiltApp} from '@quilted/rollup/app';

export default quiltApp({
  browser: {entry: './browser.tsx'},
  server: {entry: './server.tsx'},
});
