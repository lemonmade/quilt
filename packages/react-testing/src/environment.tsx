import {createRef} from 'react';
import type {ReactElement} from 'react';

import type {
  Node as BaseNode,
  Root as BaseRoot,
  RootNode,
  PlainObject,
  EmptyObject,
  EraseIfEmpty,
  IfEmptyObject,
} from './types';

import {TestRenderer} from './TestRenderer';

import {HookRunner} from './HookRunner';
import type {ImperativeApi as HookRunnerImperativeApi} from './HookRunner';

import {nodeName, toReactString} from './print';

const IS_NODE = Symbol.for('QuiltTesting.Node');

interface BaseNodeCreationOptions<T, Extensions extends PlainObject> {
  props: T;
  instance: any;
  type: BaseNode<T, Extensions>['type'];
  children: (BaseNode<unknown, Extensions> | string)[];
}

type NodeCreationOptions<
  T,
  Extensions extends PlainObject = EmptyObject,
> = EmptyObject extends Extensions
  ? BaseNodeCreationOptions<T, Extensions>
  : BaseNodeCreationOptions<T, Extensions> & Extensions;

export interface EnvironmentOptions<
  Context,
  Extensions extends PlainObject = EmptyObject,
> {
  act<T>(action: () => T): T extends Promise<any> ? Promise<void> : void;
  mount(element: ReactElement<any>): Context;
  unmount(context: Context): void;
  update(
    instance: any,
    create: <T>(
      options: NodeCreationOptions<T, Extensions>,
    ) => BaseNode<T, Extensions>,
    context: Context,
  ): BaseNode<unknown, Extensions> | null;
  destroy?(context: Context): void;
}

type AfterMountOption<
  MountOptions extends PlainObject,
  Context extends PlainObject,
  Actions extends PlainObject,
  Extensions extends PlainObject,
  Async extends boolean,
> = Async extends true
  ? {
      afterMount(
        wrapper: RootNode<unknown, Context, Actions, Extensions>,
        options: MountOptions,
      ): PromiseLike<void>;
    }
  : {
      afterMount?(
        wrapper: RootNode<unknown, Context, Actions, Extensions>,
        options: MountOptions,
      ): void;
    };

export type ContextOption<
  MountOptions extends PlainObject = EmptyObject,
  Context extends PlainObject = EmptyObject,
> = Context extends EmptyObject
  ? {context?: never}
  : {
      context(options: MountOptions): Context;
    };

export type ActionsOption<
  MountOptions extends PlainObject = EmptyObject,
  Context extends PlainObject = EmptyObject,
  Actions extends PlainObject = EmptyObject,
  Extensions extends PlainObject = EmptyObject,
> = Actions extends EmptyObject
  ? {actions?: never}
  : {
      actions(
        root: Omit<RootNode<unknown, Context, Actions, Extensions>, 'actions'>,
        options: MountOptions,
      ): Actions;
    };

export interface RenderOption<
  MountOptions extends PlainObject = EmptyObject,
  Context extends PlainObject = EmptyObject,
> {
  render?(
    element: ReactElement<any>,
    context: Context,
    options: MountOptions,
  ): ReactElement<any>;
}

export type MountOptionsOverrideOption<
  CreateMountOptions extends PlainObject = EmptyObject,
  MountOptions extends PlainObject = EmptyObject,
> = MountOptions extends EmptyObject
  ? {options?: never}
  : {
      options?(
        current: MountOptions & EraseIfEmpty<CreateMountOptions>,
      ): Partial<MountOptions>;
    };

type CustomMountOptions<
  MountOptions extends PlainObject = EmptyObject,
  CreateContext extends PlainObject = EmptyObject,
  Context extends PlainObject = CreateContext,
  CreateActions extends PlainObject = EmptyObject,
  Actions extends PlainObject = EmptyObject,
  Extensions extends PlainObject = EmptyObject,
  Async extends boolean = false,
> = RenderOption<MountOptions, Context> &
  ContextOption<MountOptions, CreateContext> &
  ActionsOption<MountOptions, Context, CreateActions, Extensions> &
  AfterMountOption<MountOptions, Context, Actions, Extensions, Async>;

type CustomMountExtendOptions<
  CreateMountOptions extends PlainObject = EmptyObject,
  MountOptions extends PlainObject = EmptyObject,
  CreateContext extends PlainObject = EmptyObject,
  Context extends PlainObject = CreateContext,
  CreateActions extends PlainObject = EmptyObject,
  Actions extends PlainObject = EmptyObject,
  Extensions extends PlainObject = EmptyObject,
  Async extends boolean = false,
> = CustomMountOptions<
  IfEmptyObject<
    MountOptions,
    CreateMountOptions,
    MountOptions & EraseIfEmpty<CreateMountOptions>
  >,
  CreateContext,
  Context,
  CreateActions,
  Actions,
  Extensions,
  Async
> &
  MountOptionsOverrideOption<CreateMountOptions, MountOptions>;

export interface CustomMount<
  MountOptions extends PlainObject,
  Context extends PlainObject,
  Actions extends PlainObject,
  Extensions extends PlainObject,
  Async extends boolean,
> {
  <Props>(
    element: ReactElement<any>,
    options?: MountOptions,
  ): CustomMountResult<Props, Context, Actions, Extensions, Async>;
  extend<
    AdditionalMountOptions extends PlainObject = EmptyObject,
    AdditionalContext extends PlainObject = EmptyObject,
    AdditionalActions extends PlainObject = EmptyObject,
    AdditionalAsync extends boolean = false,
  >(
    options: CustomMountExtendOptions<
      AdditionalMountOptions,
      IfEmptyObject<
        MountOptions,
        AdditionalMountOptions,
        MountOptions & EraseIfEmpty<AdditionalMountOptions>
      >,
      AdditionalContext,
      IfEmptyObject<
        Context,
        AdditionalContext,
        Context & EraseIfEmpty<AdditionalContext>
      >,
      AdditionalActions,
      IfEmptyObject<
        Actions,
        AdditionalActions,
        Actions & EraseIfEmpty<AdditionalActions>
      >,
      Extensions,
      AdditionalAsync
    >,
  ): CustomMount<
    IfEmptyObject<
      MountOptions,
      AdditionalMountOptions,
      MountOptions & EraseIfEmpty<AdditionalMountOptions>
    >,
    IfEmptyObject<
      Context,
      AdditionalContext,
      Context & EraseIfEmpty<AdditionalContext>
    >,
    IfEmptyObject<
      Actions,
      AdditionalActions,
      Actions & EraseIfEmpty<AdditionalActions>
    >,
    Extensions,
    AdditionalAsync extends true ? AdditionalAsync : Async
  >;
  hook<T>(
    useHook: () => T,
    options?: MountOptions,
  ): Async extends true
    ? Promise<HookRunner<T, Context, Actions>>
    : HookRunner<T, Context, Actions>;
}

export interface HookRunner<
  HookReturn,
  Context extends PlainObject,
  Actions extends PlainObject,
> {
  readonly current: HookReturn;
  // Alias for `current`, reads better in some tests
  readonly value: HookReturn;
  readonly context: Context;
  readonly actions: Actions;
  mount(): void;
  unmount(): void;
  act<T>(action: (value: HookReturn) => T): T;
}

type CustomMountResult<
  Props,
  Context extends PlainObject,
  Actions extends PlainObject,
  Extensions extends PlainObject,
  Async extends boolean,
> = Async extends true
  ? Promise<RootNode<Props, Context, Actions, Extensions>>
  : RootNode<Props, Context, Actions, Extensions>;

interface Environment<Extensions extends PlainObject = EmptyObject> {
  readonly mounted: Set<RootNode<any, any, any, Extensions>>;
  readonly mount: CustomMount<
    EmptyObject,
    EmptyObject,
    EmptyObject,
    Extensions,
    false
  >;
  createMount<
    MountOptions extends PlainObject = EmptyObject,
    Context extends PlainObject = EmptyObject,
    Actions extends PlainObject = EmptyObject,
    Async extends boolean = false,
  >(
    options: CustomMountOptions<
      MountOptions,
      Context,
      Context,
      Actions,
      Actions,
      Extensions,
      Async
    >,
  ): CustomMount<MountOptions, Context, Actions, Extensions, Async>;
  unmountAll(): void;
}

export function createEnvironment<
  EnvironmentContext = undefined,
  Extensions extends PlainObject = EmptyObject,
>(
  env: EnvironmentOptions<EnvironmentContext, Extensions>,
): Environment<Extensions> {
  type Node<Props> = BaseNode<Props, Extensions>;
  type Root<
    Props,
    Context extends PlainObject = EmptyObject,
    Actions extends PlainObject = EmptyObject,
  > = RootNode<Props, Context, Actions, Extensions>;

  const allMounted = new Set<Root<any, any, any>>();
  const mount = createMount({});

  return {mount, createMount, mounted: allMounted, unmountAll};

  type ResolveRoot = (node: Node<unknown>) => Node<unknown> | null;
  type Render = (element: ReactElement<unknown>) => ReactElement<unknown>;

  interface Options<
    Context extends PlainObject = EmptyObject,
    Actions extends PlainObject = EmptyObject,
  > {
    context?: Context;
    actions?: Actions;
    render?: Render;
    resolveRoot?: ResolveRoot;
  }

  function createRoot<
    Props,
    Context extends PlainObject = EmptyObject,
    Actions extends PlainObject = EmptyObject,
  >(
    element: ReactElement<Props>,
    {
      context: rootContext,
      actions: rootActions,
      render,
      resolveRoot = defaultResolveRoot,
    }: Options<Context, Actions> = {},
  ): Root<Props, Context, Actions> {
    let rootNode: Node<unknown> | null = null;
    let mounted = false;
    let acting = false;
    let context!: EnvironmentContext;
    const testRendererRef = createRef<TestRenderer<Props>>();

    const rootApi: BaseRoot<Props, Context, Actions> = {
      act,
      mount,
      unmount,
      setProps,
      context: rootContext ?? ({} as any),
      actions: rootActions ?? ({} as any),
    };

    const root: Root<Props, Context, Actions> = new Proxy(rootApi, {
      get(target, key, receiver) {
        if (Reflect.ownKeys(target).includes(key)) {
          return Reflect.get(target, key, receiver);
        }

        return withRootNode((rootNode) => Reflect.get(rootNode, key));
      },
    }) as any;

    return root;

    function createNode<T, Extensions extends PlainObject>(
      createOptions: NodeCreationOptions<T, Extensions>,
    ): BaseNode<T, Extensions> {
      const {type, props, instance, children} = createOptions;

      // We can’t just pick the remaining properties off `createOptions` with the
      // spread operator, because that attempts to invoke any getters in extensions
      // (including ones like .domNodes that may throw errors)
      const extensionPropertyDescriptors: {
        [key: string]: any;
      } = Object.getOwnPropertyDescriptors(createOptions);

      delete extensionPropertyDescriptors.type;
      delete extensionPropertyDescriptors.props;
      delete extensionPropertyDescriptors.instance;
      delete extensionPropertyDescriptors.type;

      const descendants = children.flatMap(getDescendants);

      function getDescendants(child: typeof children[number]): typeof children {
        return [
          child,
          ...(typeof child === 'string'
            ? []
            : child.children.flatMap(getDescendants)),
        ];
      }

      const find: BaseNode<T>['find'] = (type, props) =>
        (descendants.find(
          (element) =>
            isNode(element) &&
            isMatchingType(element.type, type) &&
            (props == null || equalSubset(props, element.props as PlainObject)),
        ) as any) ?? null;

      const baseNode: BaseNode<T> & {[IS_NODE]: true} = {
        [IS_NODE]: true,
        type,
        props,
        instance,
        get text() {
          return children.reduce<string>(
            (text, child) =>
              `${text}${typeof child === 'string' ? child : child.text}`,
            '',
          );
        },
        prop: (key) => props[key],
        is: (checkType) => isMatchingType(type, checkType),

        find,
        findAll: (type, props) =>
          descendants.filter(
            (element) =>
              isNode(element) &&
              isMatchingType(element.type, type) &&
              (props == null ||
                equalSubset(props, element.props as PlainObject)),
          ) as any,

        findWhere: (predicate) =>
          (descendants.find(
            (element) => isNode<Extensions>(element) && predicate(element),
          ) as any) ?? null,

        findAllWhere: (predicate) =>
          descendants.filter(
            (element) => isNode<Extensions>(element) && predicate(element),
          ) as any,

        findContext: (Context) => find(Context.Provider)?.prop('value'),

        trigger: (prop, ...args) =>
          act(
            () => {
              const propValue = props[prop];

              if (propValue == null) {
                throw new Error(
                  `Attempted to call prop ${prop} but it was not defined.`,
                );
              }

              return (propValue as any)(...(args as any[]));
            },
            {eager: true},
          ),

        triggerKeypath: (keypath: string, ...args: unknown[]) =>
          act(
            () => {
              const parts = keypath.split(/[.[\]]/g).filter(Boolean);

              let currentProp: any = props;
              const currentKeypath: string[] = [];

              for (const part of parts) {
                if (currentProp == null || typeof currentProp !== 'object') {
                  throw new Error(
                    `Attempted to access field keypath '${currentKeypath.join(
                      '.',
                    )}', but it was not an PlainObject.`,
                  );
                }

                currentProp = currentProp[part];
                currentKeypath.push(part);
              }

              if (typeof currentProp !== 'function') {
                throw new Error(
                  `Value at keypath '${keypath}' is not a function.`,
                );
              }

              return currentProp(...args);
            },
            {eager: true},
          ),

        children,
        descendants,
        debug: (options) => toReactString(baseNode, options),
        toString: () => `<${nodeName(baseNode)} />`,
      };

      const node: BaseNode<T, Extensions> = {} as any;

      Object.defineProperties(node, {
        ...Object.getOwnPropertyDescriptors(baseNode),
        ...extensionPropertyDescriptors,
      });

      return node;
    }

    function mount() {
      if (mounted) {
        throw new Error('Attempted to mount a node that was already mounted');
      }

      act(() => {
        context = env.mount(
          <TestRenderer ref={testRendererRef} render={render}>
            {element}
          </TestRenderer>,
        );
      });

      allMounted.add(root);
      mounted = true;
    }

    function unmount() {
      if (!mounted) {
        throw new Error(
          'You attempted to unmount a node that was already unmounted',
        );
      }

      assertRootNode();

      act(() => {
        env.unmount(context);
      });

      allMounted.delete(root);
      mounted = false;
    }

    function setProps(props: Partial<Props>) {
      assertRootNode();

      act(() => {
        testRendererRef.current?.setProps(props);
      });
    }

    function act<T>(action: () => T, {update = true, eager = false} = {}): T {
      const performUpdate = update ? updateRootNode : noop;
      let result!: T;

      if (acting) {
        return action();
      }

      acting = true;

      const afterResolve = () => {
        performUpdate();
        acting = false;
        return result;
      };

      const actResult = env.act(() => {
        result = action();

        // The return type of non-async `act()`, DebugPromiseLike, contains a `then` method
        // This condition checks the returned value is an actual Promise and returns it
        // to React’s `act()` call, otherwise we just want to return `undefined`
        if (isPromise(result) && !eager) {
          return Promise.resolve(result).then(noop);
        }
      });

      if (isPromise(result)) {
        if (eager) {
          performUpdate();

          return act(() => Promise.resolve(result).then(noop)).then(
            afterResolve,
          ) as any;
        } else {
          return Promise.resolve(actResult).then(afterResolve) as any;
        }
      }

      return afterResolve();
    }

    function updateRootNode() {
      rootNode =
        testRendererRef.current == null
          ? null
          : env.update(testRendererRef.current, createNode, context);

      rootNode = rootNode && resolveRoot(rootNode);
    }

    function withRootNode<T>(perform: (node: Node<unknown>) => T) {
      assertRootNode();
      return perform(rootNode!);
    }

    function assertRootNode() {
      if (rootNode == null) {
        throw new Error(
          'Attempted to operate on a mounted tree, but the component is no longer mounted',
        );
      }
    }
  }

  function defaultResolveRoot(node: Node<unknown>) {
    return typeof node.children[0] === 'string'
      ? node
      : (node.children[0] as any);
  }

  function unmountAll() {
    for (const wrapper of allMounted) {
      wrapper.unmount();
    }
  }

  function createMount<
    MountOptions extends PlainObject = EmptyObject,
    Context extends PlainObject = EmptyObject,
    Actions extends PlainObject = EmptyObject,
    Async extends boolean = false,
  >(
    createMountOptions: CustomMountOptions<
      MountOptions,
      Context,
      Context,
      Actions,
      Actions,
      Extensions,
      Async
    >,
  ): CustomMount<MountOptions, Context, Actions, Extensions, Async> {
    const {
      render = defaultRender,
      context: createContext = defaultContext,
      actions: createActions = defaultActions,
      afterMount,
    } = createMountOptions as CustomMountOptions<
      PlainObject,
      PlainObject,
      PlainObject,
      PlainObject,
      PlainObject,
      PlainObject,
      true
    >;

    function mount<Props>(
      element: ReactElement<Props>,
      options: MountOptions = {} as any,
    ) {
      const context: any = createContext?.(options);
      const actions: any = {};

      const root = createRoot<unknown, Context, Actions>(element, {
        context,
        actions,
        render: (element) => render(element, context, options),
        resolveRoot: (root) => root.find(element.type),
      });

      Object.assign(actions, createActions(root as any, options));

      root.mount();

      if (afterMount) {
        const afterMountResult = root.act(() => afterMount(root, options));

        return isPromise(afterMountResult)
          ? afterMountResult.then(() => root)
          : root;
      } else {
        return root;
      }
    }

    function testHook<T>(useHook: () => T, options?: MountOptions) {
      const hookRunnerRef = createRef<HookRunnerImperativeApi<T>>();

      const rootOrPromise = mount(
        <HookRunner useHook={useHook} ref={hookRunnerRef} />,
        options,
      );

      const withRoot = (
        root: Extract<typeof rootOrPromise, Root<any, any, any>>,
      ): HookRunner<T, Context, Actions> => {
        const getCurrentValue = () => {
          if (hookRunnerRef.current == null) {
            throw new Error(
              'Attempted to access the hook value while the hook runner was not mounted',
            );
          }

          return hookRunnerRef.current.current;
        };

        return {
          get current() {
            return getCurrentValue();
          },
          get value() {
            return getCurrentValue();
          },
          get context() {
            return root.context;
          },
          get actions() {
            return root.actions;
          },
          act(action) {
            return root.act(() => action(getCurrentValue()));
          },
          mount() {
            root.mount();
          },
          unmount() {
            root.unmount();
          },
        };
      };

      return 'then' in rootOrPromise
        ? rootOrPromise.then((root) => withRoot(root))
        : withRoot(rootOrPromise);
    }

    Reflect.defineProperty(mount, 'hook', {
      writable: false,
      value: testHook,
    });

    Reflect.defineProperty(mount, 'extend', {
      writable: false,
      value: ({
        options: customizeOptions,
        context: createAdditionalContext = defaultContext,
        actions: createAdditionalActions = defaultActions,
        render: additionalRender = defaultRender,
        afterMount: additionalAfterMount = noop,
      }: CustomMountExtendOptions<any, any, any, any, any, any, any>) => {
        const extendedMount = createMount<any, any, any, any>({
          context: (options) => ({
            ...createContext(options),
            ...createAdditionalContext(options),
          }),
          actions: (root, options) => ({
            ...createActions(root, options),
            ...createAdditionalActions(root, options),
          }),
          render: (element, context, options) =>
            render(
              additionalRender(element, context, options),
              context,
              options,
            ),
          afterMount: (wrapper, options) => {
            const result = additionalAfterMount(wrapper, options) as any;
            const finalResult = () =>
              afterMount ? afterMount(wrapper, options) : undefined;

            return isPromise(result) ? result.then(finalResult) : finalResult();
          },
        });

        return customizeOptions
          ? (element: any, options = {}) =>
              extendedMount(element, {...options, ...customizeOptions(options)})
          : extendedMount;
      },
    });

    return mount as any;
  }
}

function defaultRender(element: ReactElement<any>) {
  return element;
}

function defaultContext() {
  return {} as any;
}

function defaultActions() {
  return {} as any;
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
function noop() {}

export function isNode<Extensions extends PlainObject = EmptyObject>(
  maybeNode: unknown,
): maybeNode is BaseNode<unknown, Extensions> {
  return maybeNode != null && (maybeNode as any)[IS_NODE];
}

function isPromise<T>(promise: unknown): promise is Promise<T> {
  return typeof (promise as any)?.then === 'function';
}

function isMatchingType(type: unknown, test: unknown): boolean {
  if (type === test) {
    return true;
  }

  if (test == null) {
    return false;
  }

  return (test as any).type != null && isMatchingType(type, (test as any).type);
}

function equalSubset(subset: PlainObject, full: PlainObject) {
  return Object.keys(subset).every(
    (key) => key in full && (full as any)[key] === (subset as any)[key],
  );
}
