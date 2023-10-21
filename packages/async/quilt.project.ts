import {quiltPackage, createProject} from '@quilted/craft';

export default createProject((project) => {
  project.use(quiltPackage());
});
