import {createProject, quiltPackage} from '@quilted/craft';

export default createProject((project) => {
  project.use(
    quiltPackage({
      executable: {
        'create-quilt-app': './source/index.ts',
      },
      build: {bundle: true},
    }),
  );
});
