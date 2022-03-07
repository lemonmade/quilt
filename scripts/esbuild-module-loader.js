// Adapted from: https://github.com/swc-project/register/issues/8
// Adapted from: https://nodejs.org/api/esm.html#esm_transpiler_loader

import {URL, pathToFileURL} from 'url';
import {cwd} from 'process';
import {existsSync} from 'fs';
import {transformSync} from 'esbuild';
import sourceMapSupport from 'source-map-support';
import * as path from 'path';

const baseURL = pathToFileURL(`${cwd()}/`).href;

const extensionsRegex = /\.ts$/;

////////////////////////////////////////////////////////////////////////////////

//
// `specifier` is like `request` using CJS terminology.
//    E.g.
//    - file:///xxx/cli-swc/bin/index.js
//    - regenerator-runtime
//    - @live/simple-cli-helper/lib/swc.js
//    - ./index
//
export function resolve(specifier, context, defaultResolve) {
  const {parentURL = baseURL} = context;

  // Node.js `defaultResolve` normally errors on unknown file extensions so we resolve it ourselves.

  if (extensionsRegex.test(specifier)) {
    const newUrl = new URL(specifier, parentURL);
    return {url: newUrl.href};
  }

  if (
    (specifier.startsWith('./') || specifier.startsWith('../')) &&
    !hasExtension(specifier)
  ) {
    // If no extension, assume TS.
    let newUrl = new URL(`${specifier}.ts`, parentURL);

    if (!existsSync(newUrl)) {
      newUrl = new URL(`${specifier}/index.ts`, parentURL);
    }

    return {url: newUrl.href};
  }

  // Let Node.js handle all other specifiers.
  return defaultResolve(specifier, context, defaultResolve);
}

function hasExtension(specifier) {
  return path.extname(specifier) !== '';
}

export function getFormat(url, context, defaultGetFormat) {
  // Now that we patched resolve to let TS URLs through, we need to
  // tell Node.js what format such URLs should be interpreted as. For the
  // purposes of this loader, all TS URLs are ES modules.
  if (extensionsRegex.test(url)) {
    return {
      format: 'module',
    };
  }

  // Let Node.js handle all other URLs.
  return defaultGetFormat(url, context, defaultGetFormat);
}

export function transformSource(source, context, defaultTransformSource) {
  const {url} = context;

  const opts = {};

  if (extensionsRegex.test(url)) {
    if (typeof source !== 'string') {
      source = source.toString();
    }
    const code = compile(url, source, opts);
    return {source: code};
  }

  // Let Node.js handle all other sources.
  return defaultTransformSource(source, context, defaultTransformSource);
}

////////////////////////////////////////////////////////////////////////////////

const maps = {};

function compile(filename, code, opts) {
  const output = transformSync(code, {
    ...opts,
    loader: 'ts',
    sourcemap: opts.sourceMaps === undefined ? 'inline' : opts.sourceMaps,
  });

  if (output.map) {
    if (Object.keys(maps).length === 0) {
      installSourceMapSupport();
    }
    maps[filename] = output.map;
  }
  return output.code;
}

////////////////////////////////////////////////////////////////////////////////

function installSourceMapSupport() {
  sourceMapSupport.install({
    handleUncaughtExceptions: false,
    environment: 'node',
    retrieveSourceMap(source) {
      const map = maps && maps[source];
      if (map) {
        return {
          url: null,
          map,
        };
      } else {
        return null;
      }
    },
  });
}
