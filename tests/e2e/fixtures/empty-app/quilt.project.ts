import {createProject, quiltApp, quiltWorkspace} from '@quilted/craft';
import {addInternalExportCondition} from '../../common/craft.ts';

export default createProject((project) => {
  project.use(quiltWorkspace(), quiltApp(), addInternalExportCondition());
});
