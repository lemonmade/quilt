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

export {prompt} from './prompt.ts';
export {
  createTemplate,
  createPackageTemplates,
  type Template,
  type TemplateCopyOptions,
  type PackageTemplates,
} from './template.ts';
export {
  getPackageManager,
  createPackageManagerRunner,
  type PackageManager,
  type PackageManagerRunner,
} from './package-manager.ts';

export {color};
