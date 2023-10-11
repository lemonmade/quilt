import {createProject, quiltPackage, createProjectPlugin} from '@quilted/craft';
import type {} from '@quilted/craft/tools/jest';

export default createProject((project) => {
  project.use(
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
