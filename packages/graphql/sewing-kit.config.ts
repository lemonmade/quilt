import {createPackage, quiltPackage, Runtime} from '@quilted/craft';

export default createPackage((pkg) => {
  pkg.entry({source: './src/index'});
  pkg.entry({name: 'transform', source: './src/transform'});
  pkg.entry({name: 'fixtures', source: './src/fixtures/index'});
  pkg.entry({name: 'typescript', source: './src/typescript'});
  pkg.entry({
    name: 'sewing-kit',
    source: './src/sewing-kit',
    runtime: Runtime.Node,
  });
  pkg.entry({
    name: 'rollup',
    source: './src/rollup-parts',
    runtime: Runtime.Node,
  });
  pkg.entry({name: 'jest', source: './src/jest-parts', runtime: Runtime.Node});
  pkg.entry({
    name: 'matchers',
    source: './src/matchers/index',
    runtime: Runtime.Node,
  });
  pkg.binary({
    name: 'quilt-graphql-typescript',
    source: './src/typescript/cli',
  });
  pkg.use(quiltPackage());
});
