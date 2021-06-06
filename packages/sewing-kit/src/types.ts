import type {GlobbyOptions} from 'globby';

export enum Environment {
  Development = 'development',
  Production = 'production',
  Staging = 'staging',
  Test = 'test',
}

export enum Runtime {
  Node = 'node',
  Browser = 'browser',
}

export enum ProjectKind {
  App = 'app',
  Service = 'service',
  Package = 'package',
}

export enum Task {
  Lint = 'lint',
  Test = 'test',
  Build = 'build',
  Develop = 'develop',
  TypeCheck = 'type-check',
}

export type ValueOrPromise<T> = T | Promise<T>;
export type ValueOrFalsy<T> = T | null | undefined | false;

export interface LogUiComponents {
  Code(code: string): string;
  Link(text: string, options: {to: string | URL}): string;
  Text(
    text: string,
    options: {emphasis?: 'strong' | 'subdued'; role?: 'critical' | 'success'},
  ): string;
}

export type Loggable = string | ((ui: LogUiComponents) => string);

export type LogLevel = 'errors' | 'warnings' | 'info' | 'debug';

export interface LogOptions {
  level?: LogLevel;
}

export type Log = (loggable: Loggable, options?: LogOptions) => void;

export interface FileSystem {
  read(file: string): Promise<string>;
  write(file: string, contents: string): Promise<void>;
  append(file: string, contents: string): Promise<void>;
  remove(file: string): Promise<void>;
  copy(from: string, to: string): Promise<void>;
  hasFile(file: string): Promise<boolean>;
  hasDirectory(dir: string): Promise<boolean>;
  glob(pattern: string, options: Omit<GlobbyOptions, 'cwd'>): Promise<string[]>;
  resolvePath(...paths: string[]): string;
}

export interface UserFileSystem extends FileSystem {
  buildPath(...paths: string[]): string;
}

export interface InternalFileSystem extends FileSystem {
  tempPath(...paths: string[]): string;
}
