import {createPackage, quiltPackage, Runtime} from '@quilted/craft';

export default createPackage((pkg) => {
  pkg.entry({source: './source/index'});
  pkg.entry({name: 'transform', source: './source/transform'});
  pkg.entry({name: 'fixtures', source: './source/fixtures/index'});
  pkg.entry({name: 'typescript', source: './source/typescript'});
  pkg.entry({
    name: 'rollup',
    source: './source/rollup-parts',
    runtime: Runtime.Node,
  });
  pkg.entry({
    name: 'jest',
    source: './source/jest-parts',
    runtime: Runtime.Node,
  });
  pkg.entry({
    name: 'matchers',
    source: './source/matchers/index',
    runtime: Runtime.Node,
  });
  pkg.entry({
    name: 'configuration',
    source: './source/configuration',
    runtime: Runtime.Node,
  });
  pkg.binary({
    name: 'quilt-graphql-typescript',
    source: './source/typescript/cli',
  });
  pkg.use(quiltPackage());
});
