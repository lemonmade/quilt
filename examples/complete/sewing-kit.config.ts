import {createApp, quiltApp} from '@quilted/craft';

export default createApp((app) => {
  app.name('example-complete');
  app.entry('./App');
  app.use(quiltApp());
});
