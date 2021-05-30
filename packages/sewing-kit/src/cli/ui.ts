import * as format from 'colorette';

import {LogLevel} from '../types';
import type {Log, LogOptions, Loggable, LogUiComponents} from '../types';

import {DiagnosticError} from '../errors';

export {LogLevel};
export type {Log, LogOptions, Loggable, LogUiComponents};

interface Options {
  stdin: NodeJS.ReadStream;
  stdout: NodeJS.WriteStream;
  stderr: NodeJS.WriteStream;
  level?: 'errors' | 'warnings' | 'info' | 'debug';
  isInteractive: boolean;
}

export class Ui {
  readonly stdout: FormattedStream;
  readonly stderr: FormattedStream;
  readonly level: LogLevel;
  readonly isInteractive: boolean;

  constructor({
    stdout = process.stdout,
    stderr = process.stderr,
    level = 'info',
    isInteractive = false,
  }: Partial<Options> = {}) {
    this.stdout = new FormattedStream(stdout);
    this.stderr = new FormattedStream(stderr);
    this.level = normalizeLogLevel(level);
    this.isInteractive = isInteractive;
  }

  log: Log = (value, {level = LogLevel.Info} = {}) => {
    if (!this.canLogLevel(level)) {
      return;
    }

    this.stdout.write(value);
    this.stdout.write('\n');
  };

  error: Log = (value, {level = LogLevel.Info} = {}) => {
    if (!this.canLogLevel(level)) {
      return;
    }

    this.stderr.write(value);
    this.stderr.write('\n');
  };

  canLogLevel = (level: LogLevel) => {
    return this.level >= level;
  };
}

function createUi(_stream: NodeJS.WriteStream): LogUiComponents {
  return {
    Code(code) {
      return format.cyan(code);
    },
    Link(text, {to}) {
      return `${text} (${format.underline(to.toString())})`;
    },
    Text(text, {emphasis, role} = {}) {
      let finalText = text;

      if (role) {
        switch (role) {
          case 'success': {
            finalText = format.green(finalText);
            break;
          }
          case 'critical': {
            finalText = format.red(finalText);
            break;
          }
        }
      }

      if (emphasis) {
        switch (emphasis) {
          case 'strong': {
            finalText = format.bold(finalText);
            break;
          }
          case 'subdued': {
            finalText = format.dim(finalText);
            break;
          }
        }
      }

      return finalText;
    },
  };
}

class FormattedStream {
  private readonly ui: LogUiComponents;

  constructor(public readonly stream: NodeJS.WriteStream) {
    this.ui = createUi(stream);
  }

  stringify(value: Loggable) {
    return typeof value === 'function' ? value(this.ui) : String(value);
  }

  write(value: Loggable) {
    const stringified = this.stringify(value);
    this.stream.write(stringified);
    return stringified;
  }
}

function normalizeLogLevel(level: string) {
  switch (level) {
    case 'errors':
      return LogLevel.Errors;
    case 'warnings':
      return LogLevel.Warnings;
    case 'info':
      return LogLevel.Info;
    case 'debug':
      return LogLevel.Debug;
    default:
      throw new DiagnosticError({
        title: `Unrecognized log-level: ${level}`,
        suggestion: (ui) =>
          `Remove the ${ui.Code(
            '--log-level',
          )} flag and run this command again.`,
      });
  }
}
