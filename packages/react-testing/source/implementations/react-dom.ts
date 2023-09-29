import {createRoot, type Root as ReactDomRoot} from 'react-dom/client';
import {act} from 'react-dom/test-utils';

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
  HTMLNodeExtensions,
} from '../types.ts';

import {
  Tag,
  findCurrentFiberUsingSlowPath,
  type Fiber,
} from './shared/react.ts';

interface Context {
  root: ReactDomRoot;
  element: HTMLDivElement;
}

export {isNode};
export type {
  Node,
  NodeApi,
  Root,
  RootApi,
  HTMLNodeExtensions,
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
  HTMLNodeExtensions
>({
  act,
  mount(tree) {
    const element = document.createElement('div');
    document.body.appendChild(element);

    const root = createRoot(element);
    root.render(tree);

    return {root, element};
  },
  unmount({root, element}) {
    root.unmount();
    element.remove();
  },
  update(instance, create) {
    return createNodeFromFiber(instance, create) as any;
  },
});

export {render, createRender, rendered, destroyAll};

type Create = Parameters<
  EnvironmentOptions<any, HTMLNodeExtensions>['update']
>[1];
type Child = ReturnType<Create> | string;

export function createNodeFromFiber(element: any, create: Create): Child {
  const fiber = findCurrentFiberUsingSlowPath(element)!;

  if (fiber.tag === Tag.HostText) {
    return fiber.memoizedProps as string;
  }

  const props = {...((fiber.memoizedProps as any) || {})};

  const instance = fiber.stateNode;
  const isDom = typeof fiber.type === 'string';

  function children() {
    let currentFiber: Fiber | null = fiber.child;
    const children: Child[] = [];

    while (currentFiber != null) {
      const result = createNodeFromFiber(currentFiber, create);
      children.push(result);
      currentFiber = currentFiber.sibling;
    }

    return children;
  }

  return create<unknown>({
    props,
    children,
    type: fiber.type,
    instance: fiber.stateNode,
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
        this as any as NodeApi<any, HTMLNodeExtensions>
      ).children.reduce<string>(
        (text, child) =>
          `${text}${typeof child === 'string' ? child : child.html}`,
        '',
      );
    },
    get text() {
      if (instance instanceof HTMLElement) return instance.textContent ?? '';

      return (
        this as any as NodeApi<any, HTMLNodeExtensions>
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

  function getDomNodes(node: NodeApi<any, HTMLNodeExtensions>) {
    if (isDom) return [instance];

    return node.children
      .filter(
        (child): child is Node<unknown, HTMLNodeExtensions> =>
          typeof child !== 'string' && child.isDom,
      )
      .map((child) => child.instance);
  }
}
