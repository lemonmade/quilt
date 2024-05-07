import {hydrate} from 'preact';

import {App} from './App.tsx';

const element = document.querySelector('#app')!;

hydrate(<App />, element);
