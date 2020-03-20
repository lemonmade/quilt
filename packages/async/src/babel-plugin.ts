export interface Options {
  moduleId?: 'requireResolve' | 'webpackResolveWeak';
  packages?: {[key: string]: string[]};
}

interface State {
  processPackages?: Map<string, string[]>;
  opts?: Options;
}

type NodePath<T> = import('@babel/traverse').NodePath<T>;

export const DEFAULT_PACKAGES_TO_PROCESS = {
  '@quilted/async': ['createResolver'],
  '@quilted/quilt': ['createResolver', 'createAsyncComponent'],
  '@quilted/react-async': ['createResolver', 'createAsyncComponent'],
};

export default function asyncBabelPlugin({
  types: t,
}: {
  types: typeof import('@babel/types');
}) {
  return {
    visitor: {
      Program(_path: NodePath<import('@babel/types').Program>, state: State) {
        state.processPackages = new Map(
          Object.entries(state.opts?.packages ?? DEFAULT_PACKAGES_TO_PROCESS),
        );
      },
      ImportDeclaration(
        path: NodePath<import('@babel/types').ImportDeclaration>,
        state: State,
      ) {
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
              processImports.some((name) =>
                specifier.get('imported').isIdentifier({name}),
              )
            );
          });

        if (importSpecifiersToProcess.length === 0) {
          return;
        }

        for (const importSpecifier of importSpecifiersToProcess) {
          const bindingName = importSpecifier.node.local.name;
          const binding = path.scope.getBinding(bindingName);
          if (binding != null) {
            addIdOption(binding, t, state.opts);
          }
        }
      },
    },
  };
}

function addIdOption(
  binding: import('@babel/traverse').Binding,
  t: typeof import('@babel/types'),
  {moduleId = 'webpackResolveWeak'}: Options = {},
) {
  binding.referencePaths.forEach((refPath) => {
    const callExpression = refPath.parentPath;

    if (!callExpression.isCallExpression()) {
      return;
    }

    const args = callExpression.get('arguments');
    if (args.length === 0) {
      return;
    }

    const options = args[0];
    if (!options.isObjectExpression()) {
      return;
    }

    const properties = options.get('properties');
    const propertiesMap: {
      [key: string]: NodePath<import('@babel/types').ObjectMember>;
    } = {};

    properties.forEach((property) => {
      if (!property.isObjectMember() || property.node.computed) {
        return;
      }

      const key = property.get('key') as NodePath<any>;

      if (!key.isIdentifier()) {
        return;
      }

      propertiesMap[key.node.name] = property;
    });

    const {id, load: loadProperty} = propertiesMap;

    if (id != null || loadProperty == null) {
      return;
    }

    const loaderMethod = loadProperty.isObjectProperty()
      ? loadProperty.get('value')
      : loadProperty.get('body');

    const dynamicImports: NodePath<
      import('@babel/types').CallExpression
    >[] = [];

    if (!Array.isArray(loaderMethod)) {
      loaderMethod.traverse({
        Import({parentPath}) {
          if (parentPath.isCallExpression()) {
            dynamicImports.push(parentPath);
          }
        },
      });
    }

    if (!dynamicImports.length) {
      return;
    }

    if (moduleId === 'webpackResolveWeak') {
      loadProperty.insertAfter(
        t.objectProperty(
          t.identifier('id'),
          t.arrowFunctionExpression(
            [],
            t.callExpression(
              t.memberExpression(
                t.identifier('require'),
                t.identifier('resolveWeak'),
              ),
              [dynamicImports[0].get('arguments')[0].node],
            ),
            false,
            false,
          ),
        ),
      );
    } else if (moduleId === 'requireResolve') {
      propertiesMap.load.insertAfter(
        t.objectProperty(
          t.identifier('id'),
          t.arrowFunctionExpression(
            [],
            t.callExpression(
              t.memberExpression(
                t.identifier('require'),
                t.identifier('resolve'),
              ),
              [dynamicImports[0].get('arguments')[0].node],
            ),
            false,
            false,
          ),
        ),
      );
    }
  });
}
