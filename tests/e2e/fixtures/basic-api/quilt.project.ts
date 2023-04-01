import {createProject, quiltService, quiltWorkspace} from '@quilted/craft';
import {addInternalExportCondition} from '../../common/craft.ts';

export default createProject((project) => {
  project.use(
    quiltWorkspace(),
    quiltService({
      entry: './api.ts',
    }),
    addInternalExportCondition(),
  );
});
