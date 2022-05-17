import {createService, quiltService, quiltWorkspace} from '@quilted/craft';
import {addInternalExportCondition} from '../../common/craft';

export default createService((app) => {
  app.entry('./api');
  app.use(quiltWorkspace(), quiltService(), addInternalExportCondition());
});
