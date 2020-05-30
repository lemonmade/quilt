import {render, unmountComponentAtNode} from 'react-dom';
import {act} from 'react-dom/test-utils';

import {createEnvironment, Environment, isNode} from '../environment';
import type {Node, HtmlNodeExtensions} from '../types';

import {Tag} from './shared/react';
import type {Fiber} from './shared/react';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const {findCurrentFiberUsingSlowPath} = require('react-reconciler/reflection');

interface Context {
  element: HTMLDivElement;
}

export {isNode};
export type {Node, HtmlNodeExtensions};

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

type Create = Parameters<Environment<any, HtmlNodeExtensions>['update']>[1];
type Child = ReturnType<Create> | string;

export function createNodeFromFiber(element: any, create: Create): Child {
  const fiber: Fiber = findCurrentFiberUsingSlowPath(element);

  if (fiber.tag === Tag.HostText) {
    return fiber.memoizedProps as string;
  }

  const props = {...((fiber.memoizedProps as any) || {})};

  let currentFiber: Fiber | null = fiber.child;
  const children: Child[] = [];

  while (currentFiber != null) {
    const result = createNodeFromFiber(currentFiber, create);
    children.push(result);
    currentFiber = currentFiber.sibling;
  }

  const instance = fiber.stateNode;
  const isDom = typeof fiber.type === 'string';

  return create<unknown>({
    props,
    children,
    type: fiber.type,
    instance: fiber.stateNode,
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
    get text() {
      if (instance instanceof HTMLElement) return instance.textContent ?? '';

      return children.reduce<string>(
        (text, child) =>
          `${text}${typeof child === 'string' ? child : child.text}`,
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
