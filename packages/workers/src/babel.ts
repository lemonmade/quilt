import type {WorkerWrapper} from './types';
import {PREFIX, QUILT_WORKER_EXPORTS} from './constants';
import {wrapperToSearchString} from './utilities';

export interface ProcessableImport {
  name: string;
  wrapperModule?: string;
}

export interface Options {
  noop?: boolean;
  packages?: {[key: string]: string[]};
}

interface State {
  process: Map<string, readonly string[]>;
  program: import('@babel/traverse').NodePath<
    import('@babel/core').types.Program
  >;
  opts?: Options;
}

export default function workerBabelPlugin({
  types: t,
  template,
}: {
  types: typeof import('@babel/core').types;
  template: typeof import('@babel/template').default;
}): import('@babel/core').PluginObj<State> {
  const noopBinding = template(
    `() => (
      new Proxy(
        {},
        {
          get() {
            return () => {
              throw new Error('You can’t call a method on a noop worker');
            };
          },
        },
      )
    );`,
    {sourceType: 'module'},
  ) as unknown as () => import('@babel/core').types.ArrowFunctionExpression;

  return {
    visitor: {
      Program(program, state) {
        state.program = program;

        const packages = state.opts?.packages ?? QUILT_WORKER_EXPORTS;

        state.process = new Map(Object.entries(packages));
      },
      ImportDeclaration(importDeclaration, state) {
        const importId = importDeclaration.node.source.value;
        const processImports = state.process.get(importId);

        if (processImports == null) {
          return;
        }

        for (const specifier of importDeclaration.get('specifiers')) {
          if (
            !specifier.isImportSpecifier() ||
            specifier.node.imported.type !== 'Identifier'
          ) {
            continue;
          }

          const importedName = specifier.node.imported.name;
          const processableImport = processImports.find(
            (name) => name === importedName,
          );

          if (processableImport == null) {
            continue;
          }

          const binding = specifier.scope.getBinding(
            specifier.node.imported.name,
          );

          if (binding == null) {
            continue;
          }

          processBinding(
            binding,
            {module: importId, function: processableImport},
            state,
          );
        }
      },
    },
  };

  function processBinding(
    binding: import('@babel/traverse').Binding,
    wrapper: WorkerWrapper,
    state: State,
  ) {
    const {program, opts: options = {}} = state;
    const {noop = false} = options;

    const callingReferences = binding.referencePaths.filter((referencePath) =>
      referencePath.parentPath!.isCallExpression(),
    );

    type CallExpressionNodePath = import('@babel/traverse').NodePath<
      import('@babel/core').types.CallExpression
    >;

    for (const referencePath of callingReferences) {
      const callExpression: CallExpressionNodePath =
        referencePath.parentPath as any;
      const dynamicImports = new Set<CallExpressionNodePath>();

      const firstArgument = callExpression.get('arguments')[0];

      firstArgument.traverse({
        Import({parentPath}) {
          if (parentPath.isCallExpression()) {
            dynamicImports.add(parentPath);
          }
        },
      });

      if (dynamicImports.size === 0) {
        return;
      }

      if (dynamicImports.size > 1) {
        throw new Error(
          'You made more than one dynamic import in the body of a web worker create function. Only one such import is allowed.',
        );
      }

      const dynamicallyImported = [...dynamicImports][0].get('arguments')[0];
      const {value: imported, confident} = dynamicallyImported.evaluate();

      if (typeof imported !== 'string' || !confident) {
        throw new Error(
          `Failed to evaluate a dynamic import to a string to create a web worker (${dynamicallyImported.getSource()})`,
        );
      }

      if (noop) {
        firstArgument.replaceWith(noopBinding());
        return;
      }

      const importId = callExpression.scope.generateUidIdentifier('worker');

      program
        .get('body')[0]
        .insertBefore(
          t.importDeclaration(
            [t.importDefaultSpecifier(importId)],
            t.stringLiteral(
              `${PREFIX}${imported}${wrapperToSearchString(wrapper)}`,
            ),
          ),
        );

      firstArgument.replaceWith(importId);
    }
  }
}
