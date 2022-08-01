import {quiltPackage, createProject} from '@quilted/craft';

export default createProject((project) => {
  project.use(
    quiltPackage({
      executable: {
        quilt: './source/cli/cli.ts',
      },
    }),
  );
});
