import {quiltPackage} from '@quilted/rollup/package';

export default quiltPackage({
  executable: {
    'quilt-graphql-typescript': './source/typescript/cli.ts',
  },
});
