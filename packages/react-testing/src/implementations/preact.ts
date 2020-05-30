import {h, VNode, ComponentChild, Component, render} from 'preact';
import {createPortal} from 'preact/compat';
import {act} from 'preact/test-utils';

import {createEnvironment, Environment} from '../environment';
import type {Node} from '../types';

import type {HtmlNodeExtensions} from './shared/html';

interface Context {
  element: HTMLDivElement;
}

const {mount, createMount, mounted, unmountAll} = createEnvironment<
  Context,
  HtmlNodeExtensions
>({
  act: act as any,
  mount(tree) {
    const element = document.createElement('div');
    document.body.appendChild(element);

    render(tree, element);

    return {element};
  },
  unmount({element}) {
    render(null, element);
    element.remove();
  },
  update(instance, create) {
    return createNodeFromComponentChild(instance, create) as any;
  },
});

export {mount, createMount, mounted, unmountAll};

type Create = Parameters<Environment<any, HtmlNodeExtensions>['update']>[1];
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

function createNodeFromVNode(node: VNode<unknown>, create: Create): Child {
  const props = {...node.props};
  const instance = getComponent(node) ?? getDOMNode(node);
  const isDom = instance instanceof HTMLElement;
  const children = toArray(getDescendants(node)).map((child) =>
    createNodeFromComponentChild(child, create),
  );

  return create({
    props,
    children,
    instance,
    type: node.type as any,
    get isDom() {
      return isDom;
    },
    get domNodes() {
      return getDomNodes();
    },
    get domNode() {
      const domNodes = getDomNodes();

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

      return children.reduce<string>(
        (text, child) =>
          `${text}${typeof child === 'string' ? child : child.html}`,
        '',
      );
    },
    data(key) {
      return (props as any)[key.startsWith('data-') ? key : `data-${key}`];
    },
  });

  function getDomNodes() {
    if (isDom) return [instance];

    return children
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

// function childrenToTree(inputChildren: ComponentChild, root: Root<any>) {
//   const children: NodeTree = [];
//   const descendants: NodeTree = [];

//   for (const child of array(inputChildren)) {
//     const wrappers = buildElementWrappers(child, root);
//     if (wrappers.length > 0) {
//       children.push(wrappers[0]);
//       descendants.push(...wrappers);
//     }
//   }

//   return {children, descendants};
// }

/**
 * Preact mangles it's private internals, this module helps us access them safely(ish)
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
 * Return the descendants of the given vnode from it's last render.
 */
export function getDescendants<P>(node: VNode<P>) {
  if (isPortal(node)) {
    return getPortalContent(node);
  }

  return (node as PreactVNode<P>).__k || [];
}

/**
 * Return the rendered DOM node associated with a rendered VNode.
 */
export function getDOMNode<P>(node: VNode<P>): PreactVNode<P>['__e'] {
  return (node as PreactVNode<P>).__e;
}

/**
 * Return the `Component` instance associated with a rendered VNode.
 */
export function getComponent<P>(node: VNode<P>): PreactComponent<P> | null {
  return (node as PreactVNode<P>).__c;
}

/**
 * Return the `VNode` associated with a component.
 */
export function getVNode<P>(component: Component<P>) {
  return (component as PreactComponent<P>).__v;
}

// Portals always use the same component function but it is only accessible by the `type` of the vdom node returned by `createPortal`
const PORTAL_TYPE = createPortal(
  h('div', {}, 'test portal'),
  document.createElement('div'),
).type;

export function isPortal(node: VNode<any>): node is VNode<PortalProps> {
  return node.type === PORTAL_TYPE;
}

// Text nodes in peact are very weird, they actually have a null `type` field (despite that not being part of the type for VNode) and their props are just the text content (despite that being typed as an object)
export function isTextNode(node: unknown): node is TextNode {
  return (
    node != null &&
    (node as any).type === null &&
    typeof (node as any).props === 'string'
  );
}

export function getPortalContainer<P>(node: VNode<P>) {
  return ((node as any) as PreactVNode<PortalProps>).props.container;
}

export function getPortalContent<P>(node: VNode<P>) {
  return ((node as any) as PreactVNode<PortalProps>).props.vnode;
}

export function getChildren<P>(node: VNode<P>) {
  if (isPortal(node)) {
    return getPortalContent(node);
  }

  return node.props.children;
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
