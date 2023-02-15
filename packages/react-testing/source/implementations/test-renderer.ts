import {
  act,
  create as createTestRenderer,
  ReactTestRenderer,
  ReactTestInstance,
} from 'react-test-renderer';

import {createEnvironment} from '../environment';
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
} from '../environment';

export type {
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

interface Context {
  renderer: ReactTestRenderer;
}

const {render, createRender, rendered, destroyAll} = createEnvironment<Context>(
  {
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
  },
);

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

export {render, createRender, rendered, destroyAll};
