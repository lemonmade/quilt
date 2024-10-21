import '@quilted/quilt/globals';
import {hydrate} from '@quilted/quilt/browser';
import {Router} from '@quilted/quilt/navigation';

import type {AppContext} from '~/shared/context.ts';
import {App} from './App.tsx';

const context = {
  router: new Router(),
} satisfies AppContext;

// Makes key parts of the app available in the browser console
Object.defineProperty(globalThis, 'app', {
  value: {context},
  enumerable: false,
  configurable: true,
});

hydrate(<App context={context} />);
