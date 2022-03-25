import {createApp, quiltApp, quiltWorkspace} from '@quilted/craft';
import {addInternalExportCondition} from '../../common/craft';

export default createApp((app) => {
  app.entry('./App');
  app.use(quiltWorkspace(), quiltApp(), addInternalExportCondition());
});
