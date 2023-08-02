import * as color from 'colorette';

export {
  on,
  once,
  AbortError,
  NestedAbortController,
  raceAgainstAbortSignal,
  createEventEmitter,
  EventEmitter,
  addEventHandler,
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
