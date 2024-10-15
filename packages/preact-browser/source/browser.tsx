import {
  hydrate as preactHydrate,
  render as preactRender,
  type ComponentChild,
} from 'preact';

import {Browser} from '@quilted/browser';

import {BrowserDetailsContext} from './context.ts';

export function render(
  component: ComponentChild,
  {element}: {element?: string | Element} = {},
) {
  const browser = new Browser();

  return preactRender(
    <BrowserDetailsContext.Provider value={browser}>
      {component}
    </BrowserDetailsContext.Provider>,
    resolveContainerNode(element),
  );
}

export function hydrate(
  component: ComponentChild,
  {element}: {element?: string | Element} = {},
) {
  const browser = new Browser();

  return preactHydrate(
    <BrowserDetailsContext.Provider value={browser}>
      {component}
    </BrowserDetailsContext.Provider>,
    resolveContainerNode(element),
  );
}

function resolveContainerNode(selectorOrElement: string | Element = '#app') {
  if (typeof selectorOrElement !== 'string') return selectorOrElement;

  const element = document.querySelector(selectorOrElement);

  if (element == null) {
    throw new Error(`No element found for selector: ${selectorOrElement}`);
  }

  return element;
}
