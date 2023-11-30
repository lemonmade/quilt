import {AbortError} from '@quilted/cli-kit';
import {createApp} from '@quilted/create';

createApp().catch((error) => {
  if (AbortError.test(error)) return;

  console.error(error);
  process.exitCode = 1;
});
