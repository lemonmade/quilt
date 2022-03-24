import {dirname, basename, extname, resolve} from 'path';
import {createHash} from 'crypto';

import type * as Babel from '@babel/types';
import type {NodePath, Binding} from '@babel/traverse';

import {PREFIX} from './constants';

export interface Options {
  packages?: {[key: string]: string[]};
}

interface State {
  filename: string;
  processPackages?: Map<string, string[]>;
  opts?: Options;
}

const DEFAULT_PACKAGES_TO_PROCESS = {
  '@quilted/async': ['createAsyncLoader'],
};

export default function asyncBabelPlugin({types: t}: {types: typeof Babel}) {
  return {
    visitor: {
      Program(_path: NodePath<Babel.Program>, state: State) {
        state.processPackages = new Map(
          Object.entries(state.opts?.packages ?? DEFAULT_PACKAGES_TO_PROCESS),
        );
      },
      ImportDeclaration(path: NodePath<Babel.ImportDeclaration>, state: State) {
        const {processPackages} = state;

        if (!(processPackages instanceof Map)) {
          return;
        }

        const source = path.node.source.value;

        const processImports = processPackages.get(source) ?? [];

        if (processImports.length === 0) {
          return;
        }

        const importSpecifiersToProcess = path
          .get('specifiers')
          .filter((specifier) => {
            return (
              specifier.isImportSpecifier() &&
              processImports.some((name) => {
                const imported = specifier.get('imported');
                return Array.isArray(imported)
                  ? imported.some((anImport) => anImport.isIdentifier({name}))
                  : imported.isIdentifier({name});
              })
            );
          });

        if (importSpecifiersToProcess.length === 0) {
          return;
        }

        for (const importSpecifier of importSpecifiersToProcess) {
          const bindingName = importSpecifier.node.local.name;
          const binding = path.scope.getBinding(bindingName);
          if (binding != null) {
            addIdOption(binding, t, state.filename);
          }
        }
      },
    },
  };
}

function addIdOption(binding: Binding, t: typeof Babel, file: string) {
  binding.referencePaths.forEach((refPath) => {
    const callExpression = refPath.parentPath!;

    if (!callExpression.isCallExpression()) {
      return;
    }

    const args = callExpression.get('arguments');
    if (!Array.isArray(args) || args.length === 0) {
      return;
    }

    const [load, options] = args;
    if (!load.isFunctionExpression() && !load.isArrowFunctionExpression()) {
      return;
    }

    const dynamicImports = new Set<[string, NodePath<any>]>();

    load.traverse({
      Import({parentPath}) {
        if (!parentPath.isCallExpression()) return;

        const [firstArgument] = parentPath.get('arguments');

        if (firstArgument == null) return;

        if (firstArgument.isStringLiteral()) {
          dynamicImports.add([firstArgument.node.value, firstArgument]);
        } else if (firstArgument.isTemplateLiteral()) {
          if (firstArgument.node.expressions.length > 0) {
            throw new Error(
              `You can only call ${
                binding.identifier.name
              }() with a static string, but found a complex template literal: ${JSON.stringify(
                firstArgument.node,
              )}`,
            );
          }

          dynamicImports.add([
            firstArgument.node.quasis[0].value.raw,
            firstArgument,
          ]);
        }
      },
    });

    if (dynamicImports.size === 0) {
      return;
    }

    if (dynamicImports.size > 1) {
      throw new Error(
        `More than one dynamic import found for async function ${
          binding.identifier.name
        }(): ${[...dynamicImports]
          .map((imported) => JSON.stringify(imported))
          .join(', ')}`,
      );
    }

    const [importSource, sourceNodePath] = [...dynamicImports][0];

    const resolved = resolve(dirname(file), importSource);
    const moduleName = basename(resolved, extname(resolved));

    const hash = createHash('sha256')
      .update(resolved)
      .digest('hex')
      .substring(0, 8);

    const id = `${moduleName}_${hash}`;

    sourceNodePath.replaceWith(
      t.stringLiteral(`${PREFIX}${importSource}?id=${id}`),
    );

    const idProperty = t.objectProperty(
      t.identifier('id'),
      t.arrowFunctionExpression([], t.stringLiteral(id)),
    );

    if (options == null) {
      callExpression.replaceWith(
        t.callExpression(callExpression.get('callee').node, [
          load.node,
          t.objectExpression([idProperty]),
        ]),
      );
    } else if (options.isObjectExpression()) {
      options.replaceWith(
        t.objectExpression([
          ...options.node.properties.filter((property) => {
            property.type !== 'ObjectProperty' ||
              property.computed ||
              property.key.type !== 'Identifier' ||
              property.key.name !== 'id';
          }),
          idProperty,
        ]),
      );
    } else {
      options.replaceWith(
        t.objectExpression([t.spreadElement(options.node as any), idProperty]),
      );
    }

    // loadProperty.insertAfter(
    //   t.objectProperty(
    //     t.identifier('id'),
    //     t.arrowFunctionExpression(
    //       [],
    //       dynamicImports[0].get('arguments')[0].node as any,
    //       false,
    //     ),
    //   ),
    // );
  });
}
