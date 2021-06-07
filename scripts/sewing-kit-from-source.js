import {resolve, dirname} from 'path';
import {fileURLToPath} from 'url';
import {execSync} from 'child_process';

import {rollup} from 'rollup';
import {default as commonjs} from '@rollup/plugin-commonjs';
import {default as nodeResolve} from '@rollup/plugin-node-resolve';
import {default as esbuild} from 'rollup-plugin-esbuild';
import {default as nodeExternals} from 'rollup-plugin-node-externals';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outFile = resolve(root, '.sewing-kit/internal/cli.js');

const bundle = await rollup({
  input: resolve(root, 'packages/sewing-kit/src/cli/cli.ts'),
  external: [/node_modules/],
  plugins: [
    nodeExternals(),
    nodeResolve({
      exportConditions: [
        'sewing-kit:esnext',
        'module',
        'import',
        'node',
        'require',
        'default',
      ],
    }),
    commonjs(),
    esbuild({
      target: 'node14',
    }),
    esbuild({
      target: 'node14',
      include: /\.esnext$/,
      exclude: [],
    }),
  ],
});

await bundle.write({
  file: outFile,
  format: 'esm',
  inlineDynamicImports: true,
});

try {
  execSync(['node', outFile, ...process.argv.slice(2)].join(' '), {
    stdio: 'inherit',
    env: {...process.env, SEWING_KIT_FROM_SOURCE: '1'},
  });
} catch (error) {
  process.exitCode = 1;
}
