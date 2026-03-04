import './browser.css';

import type {ComponentChild} from 'preact';
import {hydrate} from '@quilted/quilt/browser';

import {BrowserAppContext} from '~/context/browser.ts';

import {App} from './App.tsx';

class BrowserApp {
  /**
   * The app's globally-available context.
   */
  readonly context: BrowserAppContext;

  /**
   * The app's root JSX element, seeded with the necessary app context.
   */
  readonly rendered: ComponentChild;

  constructor() {
    this.context = new BrowserAppContext();
    this.rendered = <App context={this.context} />;

    // Makes key parts of the app available in the browser console.
    //
    // @example
    // ```js
    // // Log the current URL
    // console.log(globalThis.app.context.navigation.router.currentRequest.url);
    // ```
    Object.defineProperty(globalThis, 'app', {
      value: this,
      enumerable: false,
      configurable: true,
      writable: true,
    });
  }

  hydrate() {
    hydrate(this.rendered);
  }
}

const app = new BrowserApp();
app.hydrate();
