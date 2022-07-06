import {quiltPackage, createProject} from '@quilted/craft';

export default createProject((project) => {
  project.use(
    quiltPackage({
      binaries: {
        quilt: './source/cli/cli.ts',
      },
    }),
  );
});
