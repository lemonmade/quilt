import {hydrateRoot} from 'react-dom/client';

import App from './App.tsx';

const element = document.querySelector('#app')!;

hydrateRoot(element, <App />);
