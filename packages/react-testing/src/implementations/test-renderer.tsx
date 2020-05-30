import {
  act,
  create as createTestRenderer,
  ReactTestRenderer,
  ReactTestRendererJSON,
} from 'react-test-renderer';

import {createEnvironment, Environment} from '../environment';

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
    return createNodeFromTree(renderer.toTree()!, create) as any;
  },
});

type Create = Parameters<Environment<any, {}>['update']>[1];

function createNodeFromTree(
  element: ReactTestRendererJSON,
  create: Create,
): ReturnType<Create> {
  const allChildren =
    element.children?.map((child) =>
      typeof child === 'string' ? child : createNodeFromTree(child, create),
    ) ?? [];

  return create<unknown>({
    props: element.props,
    type: element.type,
    instance: (element as any).instance,
    children: allChildren.filter((child) => typeof child !== 'string') as any,
  });
}

export {mount, createMount, mounted, unmountAll};
