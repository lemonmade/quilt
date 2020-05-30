import React from 'react';

import {render, unmountComponentAtNode} from 'react-dom';
import {act} from 'react-dom/test-utils';

import {createEnvironment, Environment} from './environment';
import {Fiber, Tag, ReactInstance} from './implementations/shared';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const {findCurrentFiberUsingSlowPath} = require('react-reconciler/reflection');

interface Ref<T> {
  current: T | null;
}

interface Context {
  element: HTMLDivElement;
  wrapper: Ref<TestWrapper<any>>;
}

const {mount, createMount, connected, destroyAll} = createEnvironment<Context>({
  act,
  mount(tree) {
    const element = document.createElement('div');
    const wrapper: Ref<TestWrapper<any>> = {current: null};

    render(
      <TestWrapper<Props>
        ref={(instance) => {
          wrapper.current = instance;
        }}
        render={(el) => el}
      >
        {tree}
      </TestWrapper>,
      element,
    );

    return {element, wrapper};
  },
  unmount({element}) {
    unmountComponentAtNode(element);
  },
  destroy({element}) {
    element.remove();
  },
  setProps({wrapper}, props) {
    wrapper.current?.setProps(props);
  },
  update({wrapper}, create) {
    if (wrapper.current == null) {
      return null;
    }

    return createNodeFromFiber(
      ((wrapper.current as unknown) as ReactInstance)._reactInternalFiber,
      create,
    ) as any;
  },
});

export {mount, createMount, connected, destroyAll};

interface State<ChildProps> {
  props?: Partial<ChildProps>;
}

interface Props {
  children: React.ReactElement<any>;
  render(element: React.ReactElement<any>): React.ReactElement<any>;
}

class TestWrapper<ChildProps> extends React.Component<
  Props,
  State<ChildProps>
> {
  state: State<ChildProps> = {};

  setProps(props: Partial<ChildProps>) {
    this.setState({props});
  }

  render() {
    const {props} = this.state;
    const {children, render} = this.props;
    return render(props ? React.cloneElement(children, props) : children);
  }
}

type Create = Parameters<Environment<any, {}>['update']>[1];
type Child = ReturnType<Create> | string;

function createNodeFromFiber(element: any, create: Create): Child {
  const fiber: Fiber = findCurrentFiberUsingSlowPath(element);

  if (fiber.tag === Tag.HostText) {
    return fiber.memoizedProps as string;
  }

  const props = {...((fiber.memoizedProps as any) || {})};

  let currentFiber: Fiber | null = fiber.child;
  const allChildren: Child[] = [];

  while (currentFiber != null) {
    const result = createNodeFromFiber(currentFiber, create);
    allChildren.push(result);
    currentFiber = currentFiber.sibling;
  }

  return create({
    props,
    type: fiber.type,
    instance: fiber.stateNode,
    children: allChildren.filter((child) => typeof child !== 'string') as any,
  }) as any;
}
