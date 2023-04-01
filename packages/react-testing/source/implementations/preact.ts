import {h, render as renderPreact, options} from 'preact';
import type {VNode, ComponentChild, Component} from 'preact';
import {createPortal} from 'preact/compat';
import {act} from 'preact/test-utils';

import {createEnvironment, isNode} from '../environment.tsx';
import type {
  CustomRender,
  CustomRenderResult,
  CustomRenderOptions,
  CustomRenderExtendOptions,
  HookRunner,
  Environment,
  EnvironmentOptions,
  ContextOption,
  RenderOption,
  ActionsOption,
} from '../environment.tsx';
import type {
  Node,
  NodeApi,
  Root,
  RootApi,
  HtmlNodeExtensions,
} from '../types.ts';

interface Context {
  element: HTMLDivElement;
}

export {isNode};
export type {
  Node,
  NodeApi,
  Root,
  RootApi,
  HtmlNodeExtensions,
  CustomRender,
  CustomRenderResult,
  CustomRenderOptions,
  CustomRenderExtendOptions,
  HookRunner,
  Environment,
  EnvironmentOptions,
  ContextOption,
  RenderOption,
  ActionsOption,
};

const {render, createRender, rendered, destroyAll} = createEnvironment<
  Context,
  HtmlNodeExtensions
>({
  act: act as any,
  mount(tree) {
    const element = document.createElement('div');
    document.body.appendChild(element);

    renderPreact(tree, element);

    return {element};
  },
  unmount({element}) {
    renderPreact(null, element);
    element.remove();
  },
  update(instance, create) {
    return createNodeFromComponentChild(getVNode(instance), create) as any;
  },
});

export {render, createRender, rendered, destroyAll};

type Create = Parameters<
  EnvironmentOptions<any, HtmlNodeExtensions>['update']
>[1];
type Child = ReturnType<Create> | string;

function createNodeFromComponentChild(
  child: ComponentChild,
  create: Create,
): Child {
  if (isTextNode(child)) {
    return child.props;
  }

  if (isVNode(child)) {
    return createNodeFromVNode(child, create);
  }

  return child?.toString() as any;
}

// Check that we have a native DOM node and not a custom element
function isDomVNode(vnode: VNode) {
  return typeof vnode.type === 'string' && !vnode.type.includes('-');
}

// Preact may modify property names and assign a new props object when
// preact/compat is used. This hook stores the original props object so
// that we have the original casing.
const originalProps = new WeakMap<VNode, object>();
const oldVNodeHook = options.vnode;
options.vnode = (vnode) => {
  if (isDomVNode(vnode)) {
    originalProps.set(vnode, vnode.props);
  }

  oldVNodeHook?.(vnode);
};

function createNodeFromVNode(node: VNode<unknown>, create: Create): Child {
  let props: object;

  if (isDomVNode(node)) {
    props = {...originalProps.get(node)};
    originalProps.delete(node);
  } else {
    props = {...node.props};
  }

  const instance = getComponent(node) ?? getDOMNode(node);
  const isDom = instance instanceof HTMLElement;

  return create({
    props,
    children: () =>
      toArray(getDescendants(node))
        .filter(Boolean)
        .map((child) => createNodeFromComponentChild(child, create)),
    instance,
    type: node.type as any,
    get isDom() {
      return isDom;
    },
    get domNodes() {
      return getDomNodes(this as any);
    },
    get domNode() {
      const domNodes = getDomNodes(this as any);

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

      return (
        this as any as NodeApi<any, HtmlNodeExtensions>
      ).children.reduce<string>(
        (text, child) =>
          `${text}${typeof child === 'string' ? child : child.html}`,
        '',
      );
    },
    get text() {
      if (instance instanceof HTMLElement) return instance.textContent ?? '';

      return (
        this as any as NodeApi<any, HtmlNodeExtensions>
      ).children.reduce<string>(
        (text, child) =>
          `${text}${typeof child === 'string' ? child : child.text}`,
        '',
      );
    },
    data(key) {
      return (props as any)[key.startsWith('data-') ? key : `data-${key}`];
    },
  });

  function getDomNodes(node: NodeApi<any, HtmlNodeExtensions>) {
    if (isDom) return [instance];

    return node.children
      .filter(
        (child): child is Node<unknown, HtmlNodeExtensions> =>
          typeof child !== 'string' && child.isDom,
      )
      .map((child) => child.instance);
  }
}

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
  __e: typeof window['Node'] | null;

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
function getDescendants<P>(node: VNode<P>) {
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
