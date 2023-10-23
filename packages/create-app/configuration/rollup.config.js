import {quiltPackage} from '@quilted/rollup/package';

export default quiltPackage({
  executable: {
    'create-quilt-app': './source/cli.ts',
  },
});
