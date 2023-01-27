import '@quilted/quilt/global';
import {hydrateRoot} from 'react-dom/client';

import App from './App';

const element = document.querySelector('#app')!;

hydrateRoot(element, <App />);
