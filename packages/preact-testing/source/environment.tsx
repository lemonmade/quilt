import {
  h,
  render as renderPreact,
  options,
  createRef,
  type VNode,
  type Component,
  type ComponentChild,
} from 'preact';
import {createPortal} from 'preact/compat';
import {act as actPreact} from 'preact/test-utils';

import type {
  Node,
  Root,
  PlainObject,
  EmptyObject,
  MergeObjects,
} from './types.ts';

import {TestRenderer} from './TestRenderer.tsx';

import {HookRunner} from './HookRunner.tsx';
import type {ImperativeApi as HookRunnerImperativeApi} from './HookRunner.tsx';

import {nodeName, toReactString} from './print.ts';

export type {Node, Root};

const IS_NODE = Symbol.for('QuiltTesting.Node');

export interface BaseNodeCreationOptions<T> {
  props: T;
  instance: any;
  type: Node<T>['type'];
  children: () => (Node<unknown> | string)[];
}

export type AfterRenderOption<
  RenderOptions extends PlainObject,
  Context extends PlainObject,
  Actions extends PlainObject,
  Async extends boolean,
> = Async extends true
  ? {
      afterRender(
        wrapper: Root<unknown, Context, Actions>,
        options: RenderOptions,
      ): PromiseLike<void>;
    }
  : {
      afterRender?(
        wrapper: Root<unknown, Context, Actions>,
        options: RenderOptions,
      ): void;
    };

export type ContextOption<
  RenderOptions extends PlainObject = EmptyObject,
  ExistingContext extends PlainObject = EmptyObject,
  AdditionalContext extends PlainObject = EmptyObject,
> = AdditionalContext extends EmptyObject
  ? {context?: never}
  : {
      context(
        options: RenderOptions,
        existingContext: ExistingContext,
      ): AdditionalContext;
    };

export type ActionsOption<
  RenderOptions extends PlainObject = EmptyObject,
  Context extends PlainObject = EmptyObject,
  ExistingActions extends PlainObject = EmptyObject,
  AdditionalActions extends PlainObject = EmptyObject,
> = AdditionalActions extends EmptyObject
  ? {actions?: never}
  : {
      actions(
        root: Omit<Root<unknown, Context, any>, 'actions'>,
        options: RenderOptions,
        existingActions: ExistingActions,
      ): AdditionalActions;
    };

export interface RenderOption<
  RenderOptions extends PlainObject = EmptyObject,
  Context extends PlainObject = EmptyObject,
> {
  render?(
    element: VNode<any>,
    context: Context,
    options: RenderOptions,
  ): VNode<any>;
}

export type RenderOptionsOverrideOption<
  ExistingRenderOptions extends PlainObject = EmptyObject,
  AdditionalRenderOptions extends PlainObject = EmptyObject,
> = AdditionalRenderOptions extends EmptyObject
  ? {options?: never}
  : {
      options?(
        current: MergeObjects<ExistingRenderOptions, AdditionalRenderOptions>,
      ): Partial<AdditionalRenderOptions>;
    };

export type CustomRenderOptions<
  RenderOptions extends PlainObject = EmptyObject,
  ExistingContext extends PlainObject = EmptyObject,
  AdditionalContext extends PlainObject = EmptyObject,
  ExistingActions extends PlainObject = EmptyObject,
  AdditionalActions extends PlainObject = EmptyObject,
  Async extends boolean = false,
> = RenderOption<
  RenderOptions,
  MergeObjects<ExistingContext, AdditionalContext>
> &
  ContextOption<RenderOptions, ExistingContext, AdditionalContext> &
  ActionsOption<
    RenderOptions,
    MergeObjects<ExistingContext, AdditionalContext>,
    ExistingActions,
    AdditionalActions
  > &
  AfterRenderOption<
    RenderOptions,
    MergeObjects<ExistingContext, AdditionalContext>,
    MergeObjects<ExistingActions, AdditionalActions>,
    Async
  >;

export type CustomRenderExtendOptions<
  ExistingRenderOptions extends PlainObject = EmptyObject,
  AdditionalRenderOptions extends PlainObject = EmptyObject,
  ExistingContext extends PlainObject = EmptyObject,
  AdditionalContext extends PlainObject = EmptyObject,
  ExistingActions extends PlainObject = EmptyObject,
  AdditionalActions extends PlainObject = EmptyObject,
  Async extends boolean = false,
> = CustomRenderOptions<
  MergeObjects<ExistingRenderOptions, AdditionalRenderOptions>,
  ExistingContext,
  AdditionalContext,
  ExistingActions,
  AdditionalActions,
  Async
> &
  RenderOptionsOverrideOption<ExistingRenderOptions, AdditionalRenderOptions>;

export interface CustomRender<
  RenderOptions extends PlainObject,
  Context extends PlainObject,
  Actions extends PlainObject,
  Async extends boolean,
> {
  <Props>(
    element: VNode<any>,
    options?: RenderOptions,
  ): CustomRenderResult<Props, Context, Actions, Async>;
  extend<
    AdditionalRenderOptions extends PlainObject = EmptyObject,
    AdditionalContext extends PlainObject = EmptyObject,
    AdditionalActions extends PlainObject = EmptyObject,
    AdditionalAsync extends boolean = false,
  >(
    options: CustomRenderExtendOptions<
      RenderOptions,
      AdditionalRenderOptions,
      Context,
      AdditionalContext,
      Actions,
      AdditionalActions,
      AdditionalAsync
    >,
  ): CustomRender<
    MergeObjects<RenderOptions, AdditionalRenderOptions>,
    MergeObjects<Context, AdditionalContext>,
    MergeObjects<Actions, AdditionalActions>,
    AdditionalAsync extends true ? AdditionalAsync : Async
  >;
  hook<T>(
    useHook: () => T,
    options?: RenderOptions,
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

export type CustomRenderResult<
  Props,
  Context extends PlainObject,
  Actions extends PlainObject,
  Async extends boolean,
> = Async extends true
  ? Promise<Root<Props, Context, Actions>>
  : Root<Props, Context, Actions>;

export interface Environment {
  readonly rendered: Set<Root<any, any, any>>;
  readonly render: CustomRender<EmptyObject, EmptyObject, EmptyObject, false>;
  createRender<
    RenderOptions extends PlainObject = EmptyObject,
    Context extends PlainObject = EmptyObject,
    Actions extends PlainObject = EmptyObject,
    Async extends boolean = false,
  >(
    options: CustomRenderOptions<
      RenderOptions,
      Context,
      Context,
      Actions,
      Actions,
      Async
    >,
  ): CustomRender<RenderOptions, Context, Actions, Async>;
  destroyAll(): void;
}

interface EnvironmentContext {
  element: HTMLElement;
}

export function createEnvironment(): Environment {
  const allRendered = new Set<Root<any, any, any>>();
  const render = createRender({});

  return {
    render,
    createRender: createRender as any,
    rendered: allRendered,
    destroyAll,
  };

  type ResolveRoot = (node: Node<unknown>) => Node<unknown> | null;
  type Render = (element: VNode<unknown>) => VNode<unknown>;

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
    element: VNode<Props>,
    {
      context: rootContext,
      actions: rootActions,
      render,
      resolveRoot = defaultResolveRoot,
    }: Options<Context, Actions> = {},
  ): Root<Props, Context, Actions> {
    let mounted = false;
    let acting = false;
    let context!: EnvironmentContext;
    const abort = new AbortController();
    const testRendererRef = createRef<TestRenderer<Props>>();

    let rootNode: Node<unknown> | null = null;

    const baseRoot: Omit<
      Root<Props, Context, Actions>,
      keyof Node<any> | keyof Disposable
    > = {
      act,
      mount,
      unmount,
      setProps,
      context: rootContext ?? ({} as any),
      actions: rootActions ?? ({} as any),
      signal: abort.signal,
    };

    if (Symbol.dispose) {
      (baseRoot as any)[Symbol.dispose] = () => {
        if (mounted) unmount();
      };
    }

    const root: Root<Props, Context, Actions> = new Proxy(baseRoot, {
      get(target, key, receiver) {
        if (Reflect.ownKeys(target).includes(key)) {
          return Reflect.get(target, key, receiver);
        }

        return withRootNode((root) => Reflect.get(root, key));
      },
    }) as any;

    return root;

    function mount() {
      if (mounted) {
        throw new Error('Attempted to mount a node that was already mounted');
      }

      act(() => {
        const container = document.createElement('div');
        document.body.appendChild(container);

        renderPreact(
          <TestRenderer ref={testRendererRef} render={render}>
            {element}
          </TestRenderer>,
          container,
        );

        context = {element: container};
      });

      allRendered.add(root);
      mounted = true;
    }

    function unmount() {
      if (!mounted) {
        throw new Error(
          'You attempted to unmount a node that was already unmounted',
        );
      }

      assertRoot();

      act(() => {
        renderPreact(null, context.element);
        context.element.remove();
      });

      allRendered.delete(root);
      mounted = false;
      abort.abort();
    }

    function setProps(props: Partial<Props>) {
      assertRoot();

      act(() => {
        testRendererRef.current?.setProps(props);
      });
    }

    function act<T>(action: () => T, {update = true, eager = false} = {}): T {
      const performUpdate = update ? updateRoot : noop;
      let result!: T;

      if (acting) {
        return action();
      }

      acting = true;

      const afterResolve = () => {
        acting = false;
        performUpdate();
        return result;
      };

      const actResult = actPreact(() => {
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

          return actPreact(() => Promise.resolve(result).then(noop)).then(
            afterResolve,
          ) as any;
        } else {
          return Promise.resolve(actResult).then(afterResolve) as any;
        }
      }

      return afterResolve();
    }

    function updateRoot() {
      const testRenderer = testRendererRef.current;

      if (testRenderer == null) {
        rootNode = null;
        return;
      }

      rootNode = createNodeFromVNode(getVNode(testRenderer));
      rootNode = rootNode && resolveRoot(rootNode);

      const error = testRenderer.getError();

      if (error) throw error;
    }

    function withRootNode<T>(perform: (node: Node<unknown>) => T) {
      assertRoot();
      return perform(rootNode!);
    }

    function assertRoot() {
      if (rootNode == null) {
        throw new Error(
          'Attempted to operate on a mounted tree, but the component is no longer mounted',
        );
      }
    }

    function createNodeFromComponentChild(
      child: ComponentChild,
    ): Node<unknown> | string {
      if (isTextNode(child)) {
        return child.props;
      }

      if (isVNode(child)) {
        return createNodeFromVNode(child);
      }

      return child?.toString() as any;
    }

    function createNodeFromVNode(node: VNode<any>): Node<unknown> {
      let props: Record<string, unknown>;

      if (isDOMVNode(node)) {
        props = {...originalProps.get(node)};
        originalProps.delete(node);
      } else {
        props = {...node.props};
      }

      const instance = getComponent(node) ?? getDOMNode(node);
      const isDOM = instance instanceof HTMLElement;

      let resolvedChildren: (string | Node<any>)[];
      let resolvedDescendants: (string | Node<any>)[];

      function getChildren() {
        if (resolvedChildren == null) {
          resolvedChildren = toArray(getDescendantsForVNode(node))
            .filter(Boolean)
            .map((child) => createNodeFromComponentChild(child));
        }

        return resolvedChildren;
      }

      function getDescendants() {
        if (resolvedDescendants == null) {
          resolvedDescendants = collectDescendants([], getChildren());
        }

        return resolvedDescendants;
      }

      const find: Node<unknown>['find'] = (type, props) => {
        return (
          (getDescendants().find((element) => {
            return (
              isNode(element) &&
              isMatchingType(element.type, type) &&
              (props == null ||
                equalSubset(props, element.props as PlainObject))
            );
          }) as any) ?? null
        );
      };

      function getDOMNodes(node: Node<any>) {
        if (isDOM) return [instance];

        return node.children
          .filter(
            (child): child is Node<unknown> =>
              typeof child !== 'string' && child.isDOM,
          )
          .map((child) => child.instance);
      }

      const testNode: Node<any> & {[IS_NODE]: true} = {
        [IS_NODE]: true,
        type: node.type as any,
        props,
        instance,

        get children() {
          return getChildren();
        },
        get descendants() {
          return getDescendants();
        },

        get isDOM() {
          return isDOM;
        },
        get domNodes() {
          return getDOMNodes(this as any);
        },
        get domNode() {
          const domNodes = getDOMNodes(this as any);

          if (domNodes.length > 1) {
            throw new Error(
              'You can’t call getDOMNode() on an element that returns multiple HTML elements. Call getDOMNodes() to retrieve all of the elements instead.',
            );
          }

          return domNodes[0] ?? null;
        },
        get html() {
          if (instance instanceof HTMLElement) {
            return instance.outerHTML;
          }

          return (this as any as Node<any>).children.reduce<string>(
            (text, child) =>
              `${text}${typeof child === 'string' ? child : child.html}`,
            '',
          );
        },
        get text() {
          if (instance instanceof HTMLElement)
            return instance.textContent ?? '';

          return (this as any as Node<any>).children.reduce<string>(
            (text, child) =>
              `${text}${typeof child === 'string' ? child : child.text}`,
            '',
          );
        },

        prop: (key) => props[key as string],
        data(key) {
          return (props as any)[key.startsWith('data-') ? key : `data-${key}`];
        },

        is: (checkType) => isMatchingType(node.type, checkType),

        find,
        findAll: (type, props) =>
          getDescendants().filter(
            (element) =>
              isNode(element) &&
              isMatchingType(element.type, type) &&
              (props == null ||
                equalSubset(props, element.props as PlainObject)),
          ) as any,

        findWhere: (predicate) =>
          (getDescendants().find(
            (element) => isNode(element) && predicate(element),
          ) as any) ?? null,

        findAllWhere: (predicate) =>
          getDescendants().filter(
            (element) => isNode(element) && predicate(element),
          ) as any,

        findContext: (Context) => find(Context.Provider)?.prop('value'),

        trigger: (prop, ...args) =>
          act(
            () => {
              const propValue = props[prop];

              if (propValue == null) {
                throw new Error(
                  `Attempted to call prop ${String(
                    prop,
                  )} but it was not defined.`,
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

        debug: (options) => toReactString(testNode, options),
        toString: () => `<${nodeName(testNode)} />`,
      };

      return testNode;
    }
  }

  function defaultResolveRoot(node: Node<unknown>) {
    return typeof node.children[0] === 'string'
      ? node
      : (node.children[0] as any);
  }

  function destroyAll() {
    for (const wrapper of allRendered) {
      wrapper.unmount();
    }
  }

  function createRender<
    RenderOptions extends PlainObject = EmptyObject,
    Context extends PlainObject = EmptyObject,
    Actions extends PlainObject = EmptyObject,
    Async extends boolean = false,
  >(
    createRenderOptions: CustomRenderExtendOptions<
      {},
      RenderOptions,
      Context,
      Context,
      Actions,
      Actions,
      Async
    >,
  ): CustomRender<RenderOptions, Context, Actions, Async> {
    const {
      options: customizeOptions,
      render = defaultRender,
      context: createContext = defaultContext,
      actions: createActions = defaultActions,
      afterRender,
    } = createRenderOptions as CustomRenderExtendOptions<
      PlainObject,
      PlainObject,
      PlainObject,
      PlainObject,
      PlainObject,
      PlainObject,
      true
    >;

    function mount<Props>(
      element: VNode<Props>,
      options: RenderOptions = {} as any,
    ) {
      const resolvedOptions = customizeOptions
        ? {...options, ...customizeOptions(options)}
        : options;
      const context: any = createContext(resolvedOptions, {});
      const actions: any = {};

      const root = createRoot<Props, Context, Actions>(element, {
        context,
        actions,
        render: (element) => render(element, context, resolvedOptions),
        resolveRoot: (root) => root.find(element.type),
      });

      Object.assign(actions, createActions(root as any, resolvedOptions, {}));

      root.mount();

      if (afterRender) {
        const afterRenderResult = root.act(() =>
          afterRender(root, resolvedOptions),
        );

        return isPromise(afterRenderResult)
          ? afterRenderResult.then(() => root)
          : root;
      } else {
        return root;
      }
    }

    function testHook<T>(useHook: () => T, options?: RenderOptions) {
      const hookRunnerRef = createRef<HookRunnerImperativeApi<T>>();

      const rootOrPromise = mount(
        <HookRunner useHook={useHook} ref={hookRunnerRef} />,
        options,
      );

      const withRootNode = (
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
        ? (rootOrPromise as Promise<Root<any, any, any>>).then((root) =>
            withRootNode(root),
          )
        : withRootNode(rootOrPromise);
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
        afterRender: additionalAfterRender = noop,
      }: CustomRenderExtendOptions<any, any, any, any, any, any, any>) => {
        return createRender<any, any, any, any>({
          options: customizeOptions,
          context(options, initialContext) {
            const baseContext: any = {
              ...initialContext,
              ...createContext(options, initialContext),
            };

            const additionalContext = createAdditionalContext(
              options,
              baseContext,
            );

            return {...baseContext, ...additionalContext};
          },
          actions(root, options, initialActions) {
            const baseActions = {
              ...initialActions,
              ...createActions(root, options, initialActions),
            };

            const additionalActions = createAdditionalActions(
              root,
              options,
              baseActions,
            );

            return {...baseActions, ...additionalActions};
          },
          render: (element, context, options) =>
            render(
              additionalRender(element, context, options),
              context,
              options,
            ),
          afterRender: (wrapper, options) => {
            const result = additionalAfterRender(wrapper, options) as any;
            const finalResult = () =>
              afterRender ? afterRender(wrapper, options) : undefined;

            return isPromise(result) ? result.then(finalResult) : finalResult();
          },
        });
      },
    });

    return mount as any;
  }
}

export const environment = createEnvironment();
export const render = environment.render;
export const rendered = environment.rendered;
export const createRender = environment.createRender;
export const destroyAll = environment.destroyAll;

function defaultRender(element: VNode<any>) {
  return element;
}

function defaultContext() {
  return {} as any;
}

function defaultActions() {
  return {} as any;
}

function noop() {}

export function isNode(maybeNode: unknown): maybeNode is Node<unknown> {
  return maybeNode != null && (maybeNode as any)[IS_NODE];
}

// We do a highly optimized loop since this can be called for very
// large trees of components.
function collectDescendants(
  descendants: Node<any>['descendants'],
  children: Node<any>['children'],
) {
  for (let i = 0; i < children.length; i++) {
    const child = children[i]!;
    descendants.push(child);

    if (typeof child !== 'string' && child.children.length > 0) {
      collectDescendants(descendants, child.children);
    }
  }

  return descendants;
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

// Check that we have a native DOM node and not a custom element
function isDOMVNode(vnode: VNode) {
  return typeof vnode.type === 'string' && !vnode.type.includes('-');
}

// Preact may modify property names and assign a new props object when
// preact/compat is used. This hook stores the original props object so
// that we have the original casing.
const originalProps = new WeakMap<VNode, object>();
const oldVNodeHook = options.vnode;
options.vnode = (vnode) => {
  if (isDOMVNode(vnode)) {
    originalProps.set(vnode, vnode.props);
  }

  oldVNodeHook?.(vnode);
};

function isVNode(maybeNode: ComponentChild): maybeNode is VNode<unknown> {
  return (
    typeof maybeNode === 'object' &&
    maybeNode != null &&
    Reflect.has(maybeNode, 'props')
  );
}

/**
 * Preact mangles it's private internals, these types help us access them safely(ish)
 * See https://github.com/preactjs/preact/blob/master/mangle.json
 */

interface PreactComponent<P> extends Component<P> {
  __v: VNode;
}

interface PreactVNode<P> extends VNode<P> {
  // the DOM node
  __e: (typeof window)['Node'] | null;

  // the component instance
  __c: PreactComponent<P> | null;

  // the rendered children
  __k: VNode[] | null;
}

interface TextNode {
  type: null;

  props: string;
}

export type PortalNode = PreactVNode<PortalProps>;

interface PortalProps {
  vnode: PreactVNode<unknown>;
  container: HTMLElement;
}

/**
 * Returns the descendants of the given vnode from it's last render.
 */
function getDescendantsForVNode<P>(node: VNode<P>) {
  if (isPortal(node)) {
    return getPortalContent(node);
  }

  return (node as PreactVNode<P>).__k ?? [];
}

/**
 * Returns the rendered DOM node associated with a rendered VNode.
 */
function getDOMNode<P>(node: VNode<P>): PreactVNode<P>['__e'] {
  return (node as PreactVNode<P>).__e;
}

/**
 * Returns the `Component` instance associated with a rendered VNode.
 */
function getComponent<P>(node: VNode<P>): PreactComponent<P> | null {
  return (node as PreactVNode<P>).__c;
}

/**
 * Returns the `VNode` associated with a component.
 */
function getVNode<P>(component: Component<P>) {
  return (component as PreactComponent<P>).__v;
}

// Portals always use the same component function but it is only accessible by the `type` of the vdom node returned by `createPortal`
const PORTAL_TYPE = createPortal(
  h('div', {}, 'test portal'),
  document.createElement('div'),
).type;

function isPortal(node: VNode<any>): node is VNode<PortalProps> {
  return node.type === PORTAL_TYPE;
}

// Text nodes in peact are very weird, they actually have a null `type` field (despite that not being part of the type for VNode) and their props are just the text content (despite that being typed as an object)
function isTextNode(node: unknown): node is TextNode {
  return (
    node != null &&
    (node as any).type === null &&
    typeof (node as any).props === 'string'
  );
}

function getPortalContent<P>(node: VNode<P>) {
  return (node.props as any as PreactComponent<any>).__v;
}

function toArray<T>(maybeArray: T | T[] | null | undefined) {
  if (maybeArray == null) {
    return [];
  }

  if (Array.isArray(maybeArray)) {
    return maybeArray;
  }

  return [maybeArray];
}
