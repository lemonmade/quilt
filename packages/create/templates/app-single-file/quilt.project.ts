import {createProject, quiltApp} from '@quilted/craft';

export default createProject((project) => {
  project.use(quiltApp());
});
