import {createApp, quiltApp} from '@quilted/craft';

export default createApp((app) => {
  app.entry('./app');
  app.use(quiltApp());
});
