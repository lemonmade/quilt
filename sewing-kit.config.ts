import {createWorkspace} from '@sewing-kit/config';
import {composePlugins} from '@sewing-kit/plugin-utilities';
import babel from '@sewing-kit/plugin-babel';
import eslint from '@sewing-kit/plugin-eslint';
import json from '@sewing-kit/plugin-json';
import javascript from '@sewing-kit/plugin-javascript';
import typescript from '@sewing-kit/plugin-typescript';
import jest from '@sewing-kit/plugin-jest';
import packageBase from '@sewing-kit/plugin-package-base';
import packageCommonJS from '@sewing-kit/plugin-package-commonjs';
import packageEsnext from '@sewing-kit/plugin-package-esnext';
import packageTypeScript from '@sewing-kit/plugin-package-typescript';

const plugin = composePlugins('Quilt.self', [
  babel,
  eslint,
  jest,
  json,
  javascript,
  typescript,
  packageBase,
  packageCommonJS,
  packageEsnext,
  packageTypeScript,
]);

export default createWorkspace((workspace) => {
  workspace.plugin(plugin);
});
