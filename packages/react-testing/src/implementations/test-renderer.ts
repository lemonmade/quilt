import {
  act,
  create as createTestRenderer,
  ReactTestRenderer,
  ReactTestInstance,
} from 'react-test-renderer';

import {createEnvironment, isNode} from '../environment';
import type {CustomMount, EnvironmentOptions} from '../environment';
import type {Node, Root, RootNode} from '../types';

interface Context {
  renderer: ReactTestRenderer;
}

export {isNode};
export type {Node, Root, RootNode, CustomMount};

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
    return createNodeFromTestInstance(renderer.root, create) as any;
  },
});

type Create = Parameters<EnvironmentOptions<any>['update']>[1];

function createNodeFromTestInstance(
  testInstance: ReactTestInstance,
  create: Create,
): ReturnType<Create> {
  const children =
    testInstance.children.map((child) =>
      typeof child === 'string'
        ? child
        : createNodeFromTestInstance(child, create),
    ) ?? [];

  return create<unknown>({
    props: testInstance.props,
    type: testInstance.type,
    children,
    instance: testInstance.instance,
  });
}

export {mount, createMount, mounted, unmountAll};
