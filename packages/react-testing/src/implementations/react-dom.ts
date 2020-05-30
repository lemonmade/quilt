import {render, unmountComponentAtNode} from 'react-dom';
import {act} from 'react-dom/test-utils';

import {createEnvironment} from '../environment';

import {createNodeFromFiber} from './shared/react';

interface Context {
  element: HTMLDivElement;
}

const {mount, createMount, mounted, unmountAll} = createEnvironment<Context>({
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
