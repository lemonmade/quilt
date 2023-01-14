import {
  act,
  create as createTestRenderer,
  ReactTestRenderer,
  ReactTestInstance,
} from 'react-test-renderer';

import {createEnvironment} from '../environment';
import type {EnvironmentOptions} from '../environment';

interface Context {
  renderer: ReactTestRenderer;
}

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
  function children() {
    return (
      testInstance.children.map((child) =>
        typeof child === 'string'
          ? child
          : createNodeFromTestInstance(child, create),
      ) ?? []
    );
  }

  return create<unknown>({
    props: testInstance.props,
    type: testInstance.type as any,
    children,
    instance: testInstance.instance,
  });
}

export {mount, createMount, mounted, unmountAll};
