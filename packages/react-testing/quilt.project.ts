import {createPackage, quiltPackage, createProjectPlugin} from '@quilted/craft';
import type {} from '@quilted/craft/jest';

export default createPackage((pkg) => {
  pkg.entry({source: './src/index'});
  pkg.entry({name: 'dom', source: './src/implementations/react-dom'});
  pkg.entry({name: 'preact', source: './src/implementations/preact'});
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

            for (const from of Object.keys(moduleMapper)) {
              if (/^\^react(-dom)?([/].*)?\$$/.test(from)) {
                delete newModuleMapper[from];
              }
            }

            return newModuleMapper;
          });
        });
      },
    }),
  );
});
