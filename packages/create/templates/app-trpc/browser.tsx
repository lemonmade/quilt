import '@quilted/quilt/globals';
import type {ComponentChild} from 'preact';
import {hydrate} from '@quilted/quilt/browser';
import {Router} from '@quilted/quilt/navigation';

import {httpBatchLink} from '@trpc/client';
import {QueryClient} from '@tanstack/react-query';

import type {AppContext} from '~/shared/context.ts';
import {trpc} from '~/shared/trpc.ts';

import {App} from './App.tsx';

class BrowserAppContext implements AppContext {
  readonly router: Router;
  readonly trpc: AppContext['trpc'];
  readonly queryClient: QueryClient;

  constructor() {
    this.router = new Router();
    this.queryClient = new QueryClient();
    this.trpc = trpc.createClient({
      links: [httpBatchLink({url: new URL('/api', window.location.href).href})],
    });
  }
}

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
    // console.log(globalThis.app.context.router.currentRequest.url);
    // ```
    Object.defineProperty(globalThis, 'app', {
      value: this,
      enumerable: false,
      configurable: true,
      writable: true,
    });
  }
}

const app = new BrowserApp();

hydrate(app.rendered);
