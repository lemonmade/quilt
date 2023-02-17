import {createProject, quiltModule} from '@quilted/craft';

export default createProject((project) => {
  project.use(quiltModule());
});
