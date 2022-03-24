import {createApp, quiltApp} from '@quilted/craft';
import {addInternalExportCondition} from '../../common/craft';

export default createApp((app) => {
  app.entry('./App');
  app.use(quiltApp(), addInternalExportCondition());
});
