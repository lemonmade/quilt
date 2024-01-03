import {quiltApp} from '@quilted/rollup/app';

export default quiltApp({
  assets: {
    // Un-minified assets makes it easier to debug build outputs
    minify: false,
  },
});
