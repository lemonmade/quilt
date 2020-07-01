import {retry} from 'async';

const BASE_DELAY = 100;
const MAX_DELAY = 1000;
const MAX_RETRIES = 5;

function delay(attempt: number) {
  // We don't want to suddenly send tons of retries, so we add a bit
  // of "jitter" to the delay
  const jitter = Math.random();

  // We do an exponential backoff by how many attempts we've made
  return Math.min(MAX_DELAY, 2 ** (attempt - 1) * BASE_DELAY) * jitter;
}

export function retryablePromise<T>(createPromise: () => Promise<T>) {
  return retry<T>(
    {
      times: MAX_RETRIES,
      interval: delay,
    },
    async () => {
      await createPromise();
    },
  );
}
