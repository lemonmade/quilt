/* eslint lines-between-class-members: off */

import * as path from 'path';
import {EventEmitter} from 'events';

import {sync as glob} from 'glob';
import {Headers} from 'node-fetch';
import {eachLimit} from 'async';
import {getType} from 'mime';

export interface FileUploadOptions {
  publicPath: string;
  localPath: string;
  headers: Headers;
}

export interface FileUploadResult {
  localPath: string;
  publicPath: string;
  timing: {start: number; end: number};
}

interface FileList {
  original: string[];
  filtered: string[];
}

interface Options {
  buildDirectory: string;
  ignore?:
    | readonly string[]
    | ((ignores: readonly string[]) => readonly string[]);
  prefix?: string;
  maxConcurrency?: number;
  has?(file: string): boolean;
  upload(options: FileUploadOptions): Promise<void>;
}

export function createUpload(options: Options) {
  return new Uploader(options);
}

class Uploader extends EventEmitter {
  constructor(public readonly options: Options) {
    super();
  }

  emit(event: 'error', error: Error): boolean;
  emit(event: 'file:upload:start', file: FileUploadOptions): boolean;
  emit(
    event: 'file:upload:error',
    file: FileUploadOptions,
    error: Error,
  ): boolean;
  emit(event: 'file:upload:end', result: FileUploadResult): boolean;
  emit(event: 'files:upload:end', results: FileUploadResult[]): boolean;
  emit(event: 'files:found', files: FileList): boolean;
  emit(event: string, ...args: any) {
    return super.emit(event, ...args);
  }

  on(event: 'error', listener: (error: Error) => void): this;
  on(event: 'files:found', listener: (files: FileList) => void): this;
  on(
    event: 'file:upload:start',
    listener: (file: FileUploadOptions) => void,
  ): this;
  on(
    event: 'file:upload:error',
    listener: (file: FileUploadOptions, error: Error) => void,
  ): this;
  on(
    event: 'file:upload:end',
    listener: (result: FileUploadResult) => void,
  ): this;
  on(
    event: 'files:upload:end',
    listener: (results: FileUploadResult[]) => void,
  ): this;
  on(event: string, listener: (...args: any) => void) {
    return super.on(event, listener);
  }

  run() {
    return upload(this);
  }
}

const DEFAULT_IGNORES = ['*.{html,json}'];

function isArray(value: unknown): value is any[] | readonly any[] {
  return Array.isArray(value);
}

async function upload(emitter: Uploader) {
  const {
    has = () => false,
    upload,
    buildDirectory,
    ignore = [],
    prefix,
    maxConcurrency = 20,
  } = emitter.options;

  const uploadResults: FileUploadResult[] = [];

  const normalizedIgnore = isArray(ignore)
    ? [...DEFAULT_IGNORES, ...ignore]
    : ignore([...DEFAULT_IGNORES]);

  const files = glob('**/*', {
    cwd: buildDirectory,
    absolute: false,
    nodir: true,
    ignore: normalizedIgnore,
  });

  if (files.length === 0) {
    const error = new Error(`No files were found to upload.`);
    emitter.emit('error', error);
    throw error;
  }

  const filesToUpload = files.filter((file) => !has(file));

  emitter.emit('files:found', {original: files, filtered: filesToUpload});

  if (filesToUpload.length === 0) return [];

  await eachLimit(files, maxConcurrency, async (file) => {
    const headers = new Headers({
      'Cache-Control': `public, max-age=${60 * 60 * 24 * 365}, immutable`,
    });

    const contentType = getType(file);

    if (contentType) headers.set('Content-Type', contentType);
    if (/\.br$/.test(file)) headers.set('Content-Encoding', 'br');

    const publicPath = prefix ? path.join(prefix, file) : file;
    const localPath = path.join(buildDirectory, file);

    const uploadOptions: FileUploadOptions = {
      publicPath,
      localPath,
      headers,
    };

    emitter.emit('file:upload:start', uploadOptions);

    const start = Date.now();

    try {
      await upload(uploadOptions);
    } catch (error) {
      emitter.emit('file:upload:error', uploadOptions, error);
      throw error;
    }

    const uploadResult: FileUploadResult = {
      localPath,
      publicPath,
      timing: {start, end: Date.now()},
    };

    emitter.emit('file:upload:end', uploadResult);

    uploadResults.push(uploadResult);
  });

  emitter.emit('files:upload:end', uploadResults);
  return uploadResults;
}
