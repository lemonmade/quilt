import {quiltPackage, createPackage, Runtime} from '@quilted/craft';

export default createPackage((pkg) => {
  pkg.runtime(Runtime.Node);

  pkg.entry({source: './src/index'});
  pkg.entry({name: 'kit', source: './src/kit'});

  pkg.entry({name: 'esnext', source: './src/features/esnext'});
  pkg.entry({name: 'graphql', source: './src/features/graphql'});
  pkg.entry({name: 'packages', source: './src/features/packages'});
  pkg.entry({name: 'react', source: './src/features/react'});

  pkg.entry({name: 'babel', source: './src/tools/babel'});
  pkg.entry({name: 'eslint', source: './src/tools/eslint'});
  pkg.entry({name: 'jest', source: './src/tools/jest'});
  pkg.entry({name: 'prettier', source: './src/tools/prettier'});
  pkg.entry({name: 'rollup', source: './src/tools/rollup'});
  pkg.entry({name: 'typescript', source: './src/tools/typescript'});
  pkg.entry({name: 'vite', source: './src/tools/vite'});

  pkg.binary({name: 'quilt', source: './src/cli/cli'});

  pkg.use(quiltPackage());
});
