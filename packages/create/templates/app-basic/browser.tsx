import '@quilted/quilt/globals';
import {hydrateRoot} from 'react-dom/client';
import {Browser, BrowserContext} from '@quilted/quilt/browser';

import {App} from './App.tsx';

const element = document.querySelector('#app')!;
const browser = new Browser();

hydrateRoot(
  element,
  <BrowserContext browser={browser}>
    <App />
  </BrowserContext>,
);
