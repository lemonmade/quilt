import * as color from 'colorette';

export {
  AbortError,
  NestedAbortController,
  anyAbortSignal,
  raceAgainstAbortSignal,
  createEmitter,
  on,
  once,
  addListener,
  type Emitter,
} from '@quilted/events';
export {stripIndent} from 'common-tags';
export {default as parseArguments} from 'arg';

export {prompt} from './prompt';
export {
  createTemplate,
  createPackageTemplates,
  type Template,
  type TemplateCopyOptions,
  type PackageTemplates,
} from './template';
export {
  getPackageManager,
  createPackageManagerRunner,
  type PackageManager,
  type PackageManagerRunner,
} from './package-manager';

export {color};