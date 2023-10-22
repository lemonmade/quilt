import {quiltPackage} from '@quilted/rollup/package';

export default quiltPackage({
  bundle: true,
  executable: {
    'create-quilt': './source/cli.ts',
  },
});
