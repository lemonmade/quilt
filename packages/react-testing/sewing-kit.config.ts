import {
  Runtime,
  createPackage,
  quiltPackage,
  createProjectPlugin,
} from '@quilted/craft';

export default createPackage((pkg) => {
  pkg.entry({source: './src/index'});
  pkg.entry({name: 'dom', source: './src/implementations/react-dom'});
  pkg.entry({name: 'preact', source: './src/implementations/preact'});
  pkg.entry({
    name: 'sewing-kit',
    source: './src/sewing-kit',
    runtime: Runtime.Node,
  });
  pkg.entry({
    name: 'matchers',
    source: './src/matchers/index',
  });
  pkg.entry({
    name: 'dom-matchers',
    source: './src/matchers/dom',
  });
  pkg.entry({
    name: 'environment',
    source: './src/environment',
  });
  pkg.use(
    quiltPackage({react: true}),
    createProjectPlugin({
      name: 'Quilt.ReactTesting.UndoReactAliases',
      test({configure}) {
        configure(({jestModuleMapper}) => {
          jestModuleMapper?.((moduleMapper) => {
            const newModuleMapper = {...moduleMapper};

            for (const [from, to] of Object.entries(moduleMapper)) {
              if (!to.startsWith('@quilted/quilt/react')) continue;
              delete newModuleMapper[from];
            }

            return newModuleMapper;
          });
        });
      },
    }),
  );
});
