import {createApp, quiltApp, quiltWorkspace} from '@quilted/craft';

export default createApp((app) => {
  app.entry('./app');
  app.use(quiltWorkspace(), quiltApp());
});
