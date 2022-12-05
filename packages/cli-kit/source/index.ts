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
  createTemplateCreator,
  type Template,
  type TemplateCreator,
  type TemplateCopyOptions,
} from './template';
export {getPackageManager, type PackageManager} from './package-manager';

export {color};
