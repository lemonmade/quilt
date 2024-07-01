import '@quilted/quilt/globals';
import {hydrate} from 'preact';
import {Browser, BrowserContext} from '@quilted/quilt/browser';
import {Router} from '@quilted/quilt/navigate';

import type {AppContext} from '~/shared/context.ts';
import {App} from './App.tsx';

const element = document.querySelector('#app')!;
const browser = new Browser();

const context = {
  router: new Router(browser.request.url),
} satisfies AppContext;

// Makes key parts of the app available in the browser console
Object.assign(globalThis, {app: context});

hydrate(
  <BrowserContext browser={browser}>
    <App context={context} />
  </BrowserContext>,
  element,
);
