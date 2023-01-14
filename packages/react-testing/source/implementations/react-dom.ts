import {render, unmountComponentAtNode} from 'react-dom';
import {act} from 'react-dom/test-utils';

import {createEnvironment, isNode} from '../environment';
import type {CustomMount, EnvironmentOptions} from '../environment';
import type {Node, NodeApi, Root, RootApi, HtmlNodeExtensions} from '../types';

import {Tag, findCurrentFiberUsingSlowPath} from './shared/react';
import type {Fiber} from './shared/react';

interface Context {
  element: HTMLDivElement;
}

export {isNode};
export type {Node, NodeApi, Root, RootApi, HtmlNodeExtensions, CustomMount};

const {mount, createMount, mounted, unmountAll} = createEnvironment<
  Context,
  HtmlNodeExtensions
>({
  act,
  mount(tree) {
    const element = document.createElement('div');
    document.body.appendChild(element);

    render(tree, element);

    return {element};
  },
  unmount({element}) {
    unmountComponentAtNode(element);
    element.remove();
  },
  update(instance, create) {
    return createNodeFromFiber(instance, create) as any;
  },
});

export {mount, createMount, mounted, unmountAll};

type Create = Parameters<
  EnvironmentOptions<any, HtmlNodeExtensions>['update']
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
