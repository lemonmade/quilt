import './browser.css';

import {BrowserApp} from '@quilted/quilt/browser';

import {BrowserAppContext} from '~/context/browser.ts';
import {App} from './App.tsx';

const context = new BrowserAppContext();

const app = new BrowserApp(<App context={context} />, {context});

// Makes key parts of the app available in the browser console.
//
// @example
// ```js
// // Log the current URL
// console.log(globalThis.app.context.navigation.currentRequest.url);
// ```
Object.defineProperty(globalThis, 'app', {
  value: app,
  enumerable: false,
  configurable: true,
  writable: true,
});

await app.hydrate();
