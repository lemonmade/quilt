import {createApp, quiltApp} from '@quilted/craft';

export default createApp((app) => {
  app.entry('./App');
  app.use(
    quiltApp({
      server: {
        entry: './server',
      },
    }),
  );
});
