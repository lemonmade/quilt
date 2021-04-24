// eslint-disable-next-line no-warning-comments
// TODO: rename to just be @quilted/react-workers, can be isomorphic

export {
  expose,
  release,
  retain,
  terminate,
  createWorkerFactory,
  createWorkerMessenger,
  createPlainWorkerFactory,
  createIframeWorkerMessenger,
} from '@remote-ui/web-workers';
export type {
  WorkerCreator,
  CreateWorkerOptions,
  PlainWorkerCreator,
  SafeWorkerArgument,
} from '@remote-ui/web-workers';
export {useWorker} from '@remote-ui/react/host';
export {createWorkerComponent} from './create';
export type {WorkerComponentOptions} from './create';
