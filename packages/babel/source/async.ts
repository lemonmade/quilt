import type * as Babel from '@babel/types';
import type {NodePath, Binding} from '@babel/traverse';

export const MODULE_PREFIX = 'quilt-async-module:';
export const IMPORT_PREFIX = 'quilt-async-import:';

export interface Options {
  packages?: {[key: string]: string[]};
}

interface State {
  program: NodePath<Babel.Program>;
  filename: string;
  processPackages?: Map<string, string[]>;
  opts?: Options;
}

const DEFAULT_PACKAGES_TO_PROCESS = {
  '@quilted/async': ['AsyncModule'],
  '@quilted/react-async': ['AsyncModule'],
  '@quilted/quilt/async': ['AsyncModule'],
};

export function asyncBabelPlugin({types: t}: {types: typeof Babel}) {
  return {
    visitor: {
      Program(path: NodePath<Babel.Program>, state: State) {
        state.program = path;
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
            replaceDynamicImportsWithAsyncModule(binding);
          }
        }

        function replaceDynamicImportsWithAsyncModule(binding: Binding) {
          binding.referencePaths.forEach((refPath) => {
            const callExpression = refPath.parentPath!;

            if (!callExpression.isNewExpression()) {
              return;
            }

            const args = callExpression.get('arguments');
            if (!Array.isArray(args) || args.length === 0) {
              return;
            }

            const [load] = args;
            if (load == null) {
              return;
            }

            const dynamicImports = new Set<{
              imported: string;
              path: NodePath<Babel.Import>;
            }>();

            load.traverse({
              Import(path) {
                const {parentPath} = path;

                if (!parentPath.isCallExpression()) return;

                const [firstArgument] = parentPath.get('arguments');

                if (firstArgument == null) return;

                if (firstArgument.isStringLiteral()) {
                  dynamicImports.add({
                    path,
                    imported: firstArgument.node.value,
                  });
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

                  dynamicImports.add({
                    path,
                    imported: firstArgument.node.quasis[0]!.value.raw,
                  });
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

            const {imported, path} = [...dynamicImports].at(0)!;

            const identifier = state.program.scope.generateUidIdentifier(
              `__createAsyncModule_${imported}`,
            );

            state.program.node.body.unshift(
              t.importDeclaration(
                [t.importDefaultSpecifier(identifier)],
                t.stringLiteral(`${MODULE_PREFIX}${imported}`),
              ),
            );

            const replacementCallExpression = t.callExpression(identifier, [
              load.node,
            ]);

            path.replaceWith(
              t.importExpression(
                t.stringLiteral(`${IMPORT_PREFIX}${imported}`),
              ),
            );
            load.replaceWith(replacementCallExpression);
          });
        }
      },
    },
  };
}

export default asyncBabelPlugin;
