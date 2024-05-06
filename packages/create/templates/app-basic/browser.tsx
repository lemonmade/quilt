import '@quilted/quilt/globals';
import {hydrate} from 'preact';
import {Browser, BrowserContext} from '@quilted/quilt/browser';

import {App} from './App.tsx';

const element = document.querySelector('#app')!;
const browser = new Browser();

hydrate(
  <BrowserContext browser={browser}>
    <App />
  </BrowserContext>,
  element,
);
