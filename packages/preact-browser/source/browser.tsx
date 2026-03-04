import {
  hydrate as preactHydrate,
  render as preactRender,
  type ComponentChild,
} from 'preact';

import {Browser, type BrowserDetails} from '@quilted/browser';

import {BrowserDetailsContext} from './context.ts';

/**
 * A helper class for constructing and running a Preact browser application.
 * Handles waiting for the `#app` DOM element (necessary when the entry script
 * runs with the `async` attribute and the element may not yet exist).
 */
export class BrowserApp<Context = unknown> {
  /**
   * The app's globally-available context.
   */
  readonly context: Context;

  /**
   * The app's root JSX element, seeded with the necessary app context.
   */
  readonly element: ComponentChild;

  /**
   * An API for accessing browser details, including head contents, the URL,
   * cookies, serializations, and more.
   */
  readonly browser: Browser;

  constructor(
    element: ComponentChild,
    {context}: Pick<BrowserApp<Context>, 'context'>,
  ) {
    this.element = element;
    this.context = context;
    this.browser = new Browser();
  }

  async hydrate() {
    const element = await this.#waitForDOMNode();
    hydrate(this.element, {element, browser: this.browser});
  }

  async render() {
    const element = await this.#waitForDOMNode();
    render(this.element, {element, browser: this.browser});
  }

  async #waitForDOMNode() {
    return (
      this.#queryForDOMNode() ??
      new Promise<HTMLElement>((resolve) => {
        const observer = new MutationObserver(() => {
          const el = this.#queryForDOMNode();
          if (el) {
            observer.disconnect();
            resolve(el);
          }
        });
        observer.observe(document.documentElement, {
          childList: true,
          subtree: true,
        });
      })
    );
  }

  #queryForDOMNode() {
    return document.querySelector<HTMLElement>('#app');
  }
}

export function render(
  component: ComponentChild,
  {
    element,
    browser = new Browser(),
  }: {element?: string | Element; browser?: BrowserDetails} = {},
) {
  return preactRender(
    <BrowserDetailsContext.Provider value={browser}>
      {component}
    </BrowserDetailsContext.Provider>,
    resolveContainerNode(element),
  );
}

export function hydrate(
  component: ComponentChild,
  {
    element,
    browser = new Browser(),
  }: {element?: string | Element; browser?: BrowserDetails} = {},
) {
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
