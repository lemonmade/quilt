import {createPackage, quiltPackage, createProjectPlugin} from '@quilted/craft';
import type {} from '@quilted/craft/jest';

export default createPackage((pkg) => {
  pkg.entry({source: './source/index'});
  pkg.entry({name: 'dom', source: './source/implementations/react-dom'});
  pkg.entry({name: 'preact', source: './source/implementations/preact'});
  pkg.entry({
    name: 'matchers',
    source: './source/matchers/index',
  });
  pkg.entry({
    name: 'dom-matchers',
    source: './source/matchers/dom',
  });
  pkg.entry({
    name: 'environment',
    source: './source/environment',
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
