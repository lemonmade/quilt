import * as format from 'colorette';

import {DiagnosticError} from '../kit';
import type {
  LogLevel,
  Log,
  LogOptions,
  Loggable,
  LogUiComponents,
} from '../kit';

export type {LogLevel};
export type {Log, LogOptions, Loggable, LogUiComponents};

interface Options {
  stdin: NodeJS.ReadStream;
  stdout: NodeJS.WriteStream;
  stderr: NodeJS.WriteStream;
  level?: LogLevel;
  isInteractive: boolean;
}

const ORDERED_LOG_LEVELS: LogLevel[] = ['debug', 'info', 'warnings', 'errors'];

export class Ui {
  readonly stdout: FormattedStream;
  readonly stderr: FormattedStream;
  readonly level: number;
  readonly isInteractive: boolean;

  constructor({
    stdout = process.stdout,
    stderr = process.stderr,
    level = 'info',
    isInteractive = false,
  }: Partial<Options> = {}) {
    this.stdout = new FormattedStream(stdout);
    this.stderr = new FormattedStream(stderr);
    this.level = ORDERED_LOG_LEVELS.indexOf(normalizeLogLevel(level));
    this.isInteractive = isInteractive;
  }

  log: Log = (value, {level = 'info'} = {}) => {
    if (!this.canLogLevel(level)) {
      return;
    }

    this.stdout.write(value);
    this.stdout.write('\n');
  };

  error: Log = (value, {level = 'errors'} = {}) => {
    if (!this.canLogLevel(level)) {
      return;
    }

    this.stderr.write(value);
    this.stderr.write('\n');
  };

  canLogLevel = (level: LogLevel) => {
    return this.level <= ORDERED_LOG_LEVELS.indexOf(level);
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

function normalizeLogLevel(level: string): LogLevel {
  switch (level) {
    case 'errors':
    case 'warnings':
    case 'info':
    case 'debug':
      return level;
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
