import {createProject, quiltPackage} from '@quilted/craft';

export default createProject((project) => {
  project.use(
    quiltPackage({
      binaries: {'quilt-graphql-typescript': './source/typescript/cli.ts'},
    }),
  );
});
