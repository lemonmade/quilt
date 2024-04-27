import './modules.ts';
import './assets/files.ts';
import './assets/styles.ts';

import {AsyncModulesGlobal} from '@quilted/async';

export interface QuiltGlobal {
  readonly asyncModules: AsyncModulesGlobal;
}

const property = Symbol.for('quilt');
const quilt = ((globalThis as any)[property] ?? {}) as QuiltGlobal;

(quilt as any).asyncModules = new AsyncModulesGlobal({
  cache: quilt.asyncModules,
});

Object.defineProperty(globalThis, property, {
  value: quilt,
  enumerable: false,
  configurable: true,
  writable: true,
});

export default quilt;
export {quilt, quilt as global};
