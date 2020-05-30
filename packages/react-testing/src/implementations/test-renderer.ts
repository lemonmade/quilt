import {
  act,
  create as createTestRenderer,
  ReactTestRenderer,
  ReactTestRendererJSON,
} from 'react-test-renderer';

import {createEnvironment, Environment, isNode} from '../environment';
import type {CustomMount} from '../environment';
import type {Node} from '../types';

interface Context {
  renderer: ReactTestRenderer;
}

export {isNode};
export type {Node, CustomMount};

const {mount, createMount, mounted, unmountAll} = createEnvironment<Context>({
  act,
  mount(tree) {
    const renderer = createTestRenderer(tree);
    return {renderer};
  },
  unmount({renderer}) {
    renderer.unmount();
  },
  update(_, create, {renderer}) {
    return createNodeFromTree(renderer.toTree()!, create) as any;
  },
});

type Create = Parameters<Environment<any, {}>['update']>[1];

function createNodeFromTree(
  element: ReactTestRendererJSON,
  create: Create,
): ReturnType<Create> {
  const children =
    element.children?.map((child) =>
      typeof child === 'string' ? child : createNodeFromTree(child, create),
    ) ?? [];

  return create<unknown>({
    props: element.props,
    type: element.type,
    children,
    instance: (element as any).instance,
  });
}

export {mount, createMount, mounted, unmountAll};
