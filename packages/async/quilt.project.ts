import {quiltPackage, createProject} from '@quilted/craft';

export default createProject((project) => {
  project.use(
    quiltPackage({
      // We need commonjs for the Babel plugin
      commonjs: true,
    }),
  );
});
