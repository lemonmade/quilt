import {quiltPackage, createProject, Runtime} from '@quilted/craft';

export default createProject((pkg) => {
  pkg.runtime(Runtime.Node);

  pkg.entry({source: './source/index'});
  pkg.entry({name: 'kit', source: './source/kit'});

  pkg.entry({name: 'esnext', source: './source/features/esnext'});
  pkg.entry({name: 'graphql', source: './source/features/graphql'});
  pkg.entry({name: 'packages', source: './source/features/packages'});
  pkg.entry({name: 'react', source: './source/features/react'});

  pkg.entry({name: 'babel', source: './source/tools/babel'});
  pkg.entry({name: 'eslint', source: './source/tools/eslint'});
  pkg.entry({name: 'jest', source: './source/tools/jest'});
  pkg.entry({name: 'postcss', source: './source/tools/postcss'});
  pkg.entry({name: 'prettier', source: './source/tools/prettier'});
  pkg.entry({name: 'rollup', source: './source/tools/rollup'});
  pkg.entry({name: 'typescript', source: './source/tools/typescript'});
  pkg.entry({name: 'vite', source: './source/tools/vite'});

  pkg.binary({name: 'quilt', source: './source/cli/cli'});

  pkg.use(quiltPackage());
});
