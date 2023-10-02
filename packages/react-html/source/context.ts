import {createContext} from 'react';

import {HTMLManager} from './manager.ts';

export const HTMLContext = createContext(new HTMLManager());
