import React, {ReactElement} from 'react';
import {Node as BaseNode, Root as BaseRoot} from './types';
import {TestRenderer} from './TestRenderer';

type NodeCreationOptions<T, Extensions extends object> = {
  props: T;
  instance: any;
  type: BaseNode<T, Extensions>['type'];
  children: BaseNode<unknown, Extensions>[];
} & Extensions;

export interface Environment<Context, Extensions extends object> {
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

type FullRoot<
  Props,
  Context extends object | undefined,
  Extensions extends object
> = BaseNode<Props, Extensions> & BaseRoot<Props, Context>;

type AfterMountOption<
  MountOptions extends object,
  Context extends object,
  Extensions extends object,
  Async extends boolean
> = Async extends true
  ? {
      afterMount(
        wrapper: FullRoot<unknown, Context, Extensions>,
        options: MountOptions,
      ): PromiseLike<void>;
    }
  : {
      afterMount?(
        wrapper: FullRoot<unknown, Context, Extensions>,
        options: MountOptions,
      ): void;
    };

export interface ContextOption<
  MountOptions extends object,
  Context extends object
> {
  context?(options: MountOptions): Context;
}

type CustomMountOptions<
  MountOptions extends object = {},
  CreateContext extends object = {},
  Context extends object = CreateContext,
  Extensions extends object = {},
  Async extends boolean = false
> = {
  render(
    element: ReactElement<any>,
    context: Context,
    options: MountOptions,
  ): ReactElement<any>;
} & ContextOption<MountOptions, CreateContext> &
  AfterMountOption<MountOptions, Context, Extensions, Async>;

export interface CustomMount<
  MountOptions extends object,
  Context extends object,
  Extensions extends object,
  Async extends boolean
> {
  <Props>(
    element: ReactElement<any>,
    options?: MountOptions,
  ): CustomMountResult<Props, Context, Extensions, Async>;
  extend<
    AdditionalMountOptions extends object = {},
    AdditionalContext extends object = {},
    AdditionalAsync extends boolean = false
  >(
    options: CustomMountOptions<
      MountOptions & AdditionalMountOptions,
      AdditionalContext,
      Context & AdditionalContext,
      Extensions,
      AdditionalAsync
    >,
  ): CustomMount<
    MountOptions & AdditionalMountOptions,
    Context & AdditionalContext,
    Extensions,
    AdditionalAsync extends true ? AdditionalAsync : Async
  >;
}

type CustomMountResult<
  Props,
  Context extends object,
  Extensions extends object,
  Async extends boolean
> = Async extends true
  ? Promise<FullRoot<Props, Context, Extensions>>
  : FullRoot<Props, Context, Extensions>;

export function createEnvironment<
  EnvironmentContext = undefined,
  Extensions extends object = {}
>(env: Environment<EnvironmentContext, Extensions>) {
  type Node<Props> = BaseNode<Props, Extensions>;
  type Root<Props, Context extends object | undefined = undefined> = FullRoot<
    Props,
    Context,
    Extensions
  >;

  const allMounted = new Set<Root<any, any>>();

  return {mount, createMount, mounted: allMounted, unmountAll};

  type ResolveRoot = (element: Node<unknown>) => Node<unknown> | null;
  type Render = (element: ReactElement<unknown>) => ReactElement<unknown>;

  interface Options<Context extends object | undefined = undefined> {
    context?: Context;
    render?: Render;
    resolveRoot?: ResolveRoot;
  }

  function createRoot<Props, Context extends object | undefined = undefined>(
    element: ReactElement<Props>,
    {context: rootContext, render, resolveRoot}: Options<Context> = {},
  ): Root<Props, Context> {
    let rootNode: Node<unknown> | null = null;
    let mounted = false;
    let acting = false;
    let context!: EnvironmentContext;
    const testRenderer: {current: TestRenderer<unknown> | null} = {
      current: null,
    };

    const rootApi: BaseRoot<Props, Context> = {
      act,
      mount,
      unmount,
      setProps,
      context: rootContext as any,
    };

    const root: Root<Props, Context> = new Proxy(rootApi, {
      get(target, key, receiver) {
        if (Reflect.has(target, key)) {
          return Reflect.get(target, key, receiver);
        }

        return withRootNode((rootNode) => Reflect.get(rootNode, key));
      },
    }) as any;

    return root;

    function createNode<T, Extensions extends object>({
      type,
      props,
      instance,
      children,
      ...extensions
    }: NodeCreationOptions<T, Extensions>): BaseNode<T, Extensions> {
      const finalExtensions = (extensions as any) as Extensions;

      const descendants = children.flatMap(getDescendants);

      function getDescendants(child: typeof children[number]): typeof children {
        return [child, ...child.children.flatMap(getDescendants)];
      }

      return {
        type,
        props,
        instance,
        prop: (key) => props[key],
        is: (checkType) => isMatchingType(type, checkType),
        find: (type, props) =>
          (descendants.find(
            (element) =>
              isMatchingType(element.type, type) &&
              (props == null || equalSubset(props, element.props as object)),
          ) as any) ?? null,

        findAll: (type, props) =>
          descendants.filter(
            (element) =>
              isMatchingType(element.type, type) &&
              (props == null || equalSubset(props, element.props as object)),
          ) as any,

        findWhere: (predicate) =>
          (descendants.find((element) => predicate(element)) as any) ?? null,

        findAllWhere: (predicate) =>
          descendants.filter((element) => predicate(element)) as any,

        trigger: (prop, ...args) =>
          rootApi.act(() => {
            const propValue = props[prop];

            if (propValue == null) {
              throw new Error(
                `Attempted to call prop ${prop} but it was not defined.`,
              );
            }

            return (propValue as any)(...args);
          }),

        triggerKeypath: (keypath: string, ...args: unknown[]) =>
          rootApi.act(() => {
            const parts = keypath.split(/[.[\]]/g).filter(Boolean);

            let currentProp: any = props;
            const currentKeypath: string[] = [];

            for (const part of parts) {
              if (currentProp == null || typeof currentProp !== 'object') {
                throw new Error(
                  `Attempted to access field keypath '${currentKeypath.join(
                    '.',
                  )}', but it was not an object.`,
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
          }),

        children,
        descendants,
        debug: () => '',
        toString: () => '',

        ...finalExtensions,
      };
    }

    function mount() {
      if (mounted) {
        throw new Error('Attempted to mount a node that was already mounted');
      }

      context = act(() =>
        env.mount(
          <TestRenderer
            ref={(renderer) => {
              testRenderer.current = renderer;
            }}
            render={render}
          >
            {element}
          </TestRenderer>,
        ),
      );

      rootNode =
        testRenderer.current == null
          ? null
          : env.update(testRenderer.current, createNode, context);

      rootNode =
        rootNode != null && resolveRoot != null
          ? resolveRoot(rootNode)
          : rootNode;

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
        testRenderer.current?.setProps(props);
      });
    }

    function act<T>(action: () => T, {update = true} = {}): T {
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

      const promise = env.act(() => {
        result = action();

        // The return type of non-async `act()`, DebugPromiseLike, contains a `then` method
        // This condition checks the returned value is an actual Promise and returns it
        // to React’s `act()` call, otherwise we just want to return `undefined`
        if (isPromise(result)) {
          return (result as unknown) as Promise<void>;
        }
      });

      if (isPromise(result)) {
        performUpdate();
        return Promise.resolve(promise).then(afterResolve) as any;
      }

      return afterResolve();
    }

    function updateRootNode() {}

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

  function unmountAll() {
    for (const wrapper of allMounted) {
      wrapper.unmount();
    }
  }

  function mount<Props>(element: ReactElement<Props>) {
    const root = createRoot(element);
    root.mount();
    return root;
  }

  function createMount<
    MountOptions extends object = {},
    Context extends object = {},
    Async extends boolean = false
  >({
    render,
    context: createContext = defaultContext,
    afterMount = noop,
  }: CustomMountOptions<
    MountOptions,
    Context,
    Context,
    Extensions,
    Async
  >): CustomMount<MountOptions, Context, Extensions, Async> {
    function mount<Props>(
      element: ReactElement<Props>,
      options: MountOptions = {} as any,
    ) {
      const context = createContext(options);

      const root = createRoot(element, {
        context,
        render: (element) => render(element, context, options),
        resolveRoot: (root) => root.find(element.type),
      });

      root.mount();

      const afterMountResult = afterMount(root, options);

      return isPromise(afterMountResult)
        ? afterMountResult.then(() => root)
        : root;
    }

    Reflect.defineProperty(mount, 'extend', {
      writable: false,
      value: ({
        context: createAdditionalContext = defaultContext,
        render: additionalRender,
        afterMount: additionalAfterMount = noop,
      }: CustomMountOptions<any, any, any, any>) => {
        return createMount<any, any, any>({
          context: (options) => ({
            ...createContext(options),
            ...createAdditionalContext(options),
          }),
          render: (element, context, options) =>
            render(
              additionalRender(element, context, options),
              context,
              options,
            ),
          afterMount: (wrapper, options) => {
            const result = additionalAfterMount(wrapper, options) as any;
            const finalResult = () => afterMount(wrapper, options);

            return isPromise(result) ? result.then(finalResult) : finalResult();
          },
        });
      },
    });

    return mount as any;
  }
}

function defaultContext() {
  return {} as any;
}

function noop() {}

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

function equalSubset(subset: object, full: object) {
  return Object.keys(subset).every(
    (key) => key in full && (full as any)[key] === (subset as any)[key],
  );
}
