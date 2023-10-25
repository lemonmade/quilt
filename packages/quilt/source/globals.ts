import './modules.ts';

import {
  createAsyncModulesGlobal,
  type AsyncModulesGlobal,
} from '@quilted/async';

export interface QuiltGlobal {
  readonly AsyncModules: AsyncModulesGlobal;
}

const property = Symbol.for('quilt');
const quilt = ((globalThis as any)[property] ?? {}) as QuiltGlobal;

(quilt as any).AsyncModules = createAsyncModulesGlobal({
  cache: quilt.AsyncModules,
});

Object.defineProperty(globalThis, property, {
  value: quilt,
  enumerable: false,
  configurable: true,
  writable: true,
});

export default quilt;
export {quilt, quilt as global};
