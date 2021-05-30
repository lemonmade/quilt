import {Loggable} from './types';

interface DiagnosticErrorOptions {
  title?: string;
  content?: Loggable;
  suggestion?: Loggable;
}

const ID = Symbol.for('SewingKit.DiagnosticError');

// We could use instanceof to detect this, but this convenience protects
// against potentially nested versions of @quilted/sewing-kit
export function isDiagnosticError(value: unknown) {
  return Boolean((value as any)?.[ID]);
}

export class DiagnosticError extends Error {
  readonly [ID] = true;
  readonly suggestion: DiagnosticErrorOptions['suggestion'];
  readonly title: DiagnosticErrorOptions['title'];
  readonly content: DiagnosticErrorOptions['content'];

  constructor({title, content, suggestion}: DiagnosticErrorOptions) {
    super(title);
    this.title = title;
    this.content = content;
    this.suggestion = suggestion;
  }
}

export class MissingPluginError extends DiagnosticError {
  constructor(plugin: string, pkg: string) {
    super({
      title: `Missing the \`${plugin}()\` hook provided by ${pkg}`,
      suggestion: (ui) =>
        `Run ${ui.Code(
          `yarn add ${plugin}`,
        )}, import it into your sewing-kit config file, and include it using the ${ui.Code(
          'use()',
        )} function.`,
    });
  }
}
