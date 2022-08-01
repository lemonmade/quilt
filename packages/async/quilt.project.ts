import {quiltPackage, createProject} from '@quilted/craft';

export default createProject((project) => {
  project.use(
    quiltPackage({
      build: {
        // We need commonjs for the Babel plugin
        commonjs: true,
      },
    }),
  );
});
