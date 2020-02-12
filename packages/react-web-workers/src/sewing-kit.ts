import {resolve} from 'path';
import {webWorkers, Options} from '@remote-ui/web-workers/sewing-kit';

const DEFAULT_PACKAGES: NonNullable<Options['applyBabelToPackages']> = {
  '@quilted/react-web-workers': [
    {name: 'createPlainWorkerFactory'},
    {
      name: 'createWorkerFactory',
      wrapperModule: resolve(__dirname, 'wrappers/expose.js.raw'),
    },
    {
      name: 'createWorkerComponent',
      wrapperModule: resolve(__dirname, 'wrappers/component.js.raw'),
    },
  ],
};

DEFAULT_PACKAGES['@quilted/quilt'] =
  DEFAULT_PACKAGES['@quilted/react-web-workers'];

export function reactWebWorkers() {
  return webWorkers({applyBabelToPackages: DEFAULT_PACKAGES});
}
