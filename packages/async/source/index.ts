export {
  createAsyncModulesGlobal,
  type AsyncModulesGlobal,
  type AsyncModulesOptions,
} from './global.ts';

export {createAsyncModule} from './loader.ts';
export type {
  AsyncModule,
  AsyncModuleLoad,
  AsyncModuleLoadFunction,
  AsyncModuleLoadObject,
} from './loader.ts';
