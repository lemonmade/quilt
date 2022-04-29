import {installAsyncAssetsGlobal} from '@quilted/async';
import {installApiModulesGlobal} from '@quilted/api-modules';

Reflect.defineProperty(globalThis, 'Quilt', {
  writable: false,
  configurable: true,
  enumerable: true,
  value: {},
});

installAsyncAssetsGlobal();
installApiModulesGlobal();
