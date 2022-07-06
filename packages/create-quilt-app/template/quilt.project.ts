import {createProject, quiltApp, quiltWorkspace} from '@quilted/craft';

export default createProject((project) => {
  project.use(quiltWorkspace(), quiltApp({entry: './app/index.ts'}));
});
