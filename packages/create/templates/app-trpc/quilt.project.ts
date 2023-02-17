import {createProject, quiltApp} from '@quilted/craft';

export default createProject((project) => {
  project.use(
    quiltApp({
      browser: {
        entry: './browser.tsx',
      },
      server: {
        entry: './server.tsx',
      },
    }),
  );
});
