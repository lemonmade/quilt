import {createProject, quiltPackage} from '@quilted/craft';

export default createProject((project) => {
  // We need commonjs for the babel plugin
  project.use(quiltPackage({commonjs: true}));
});
