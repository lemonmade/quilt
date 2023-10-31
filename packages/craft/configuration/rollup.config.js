import {quiltPackage} from '@quilted/rollup/package';

export default quiltPackage({
  executable: {
    quilt: './source/cli.ts',
  },
});
