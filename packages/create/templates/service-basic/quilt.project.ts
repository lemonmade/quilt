import {createProject, quiltService} from '@quilted/craft';

export default createProject((project) => {
  project.use(
    quiltService({
      entry: './service.ts',
    }),
  );
});
