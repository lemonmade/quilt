import {createContext} from 'react';

import {HtmlManager} from './manager.ts';

export const HtmlContext = createContext(new HtmlManager());
