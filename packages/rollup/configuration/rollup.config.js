import * as fs from 'fs/promises';

import {defineConfig} from 'rollup';
import esbuild from 'rollup-plugin-esbuild';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import nodeResolve from '@rollup/plugin-node-resolve';
import nodeExternals from 'rollup-plugin-node-externals';

import pkg from '../package.json' with {type: 'json'};

// We need this rollup plugin to build our other packages, so we have to manually
// author its config.
export default defineConfig({
  input: Object.values(pkg.exports).map((exports) => exports['quilt:source']),
  plugins: [
    esbuild({
      target: 'node20',
    }),
    nodeExternals(),
    nodeResolve(),
    commonjs(),
    json(),
    {
      name: 'remove-files',
      async buildStart() {
        await fs.rm('build/esm', {recursive: true, force: true});
      },
    },
  ],
  output: {
    dir: 'build/esm',
    format: 'esm',
    sourcemap: false,
    preserveModules: true,
    preserveModulesRoot: './source',
    entryFileNames: `[name].mjs`,
    assetFileNames: `[name].[ext]`,
  },
});
