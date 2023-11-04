import {quiltAppOptions} from '@quilted/rollup/app';

export default quiltAppOptions({
  browser: {entry: './browser.tsx'},
  server: {entry: './server.tsx'},
});
