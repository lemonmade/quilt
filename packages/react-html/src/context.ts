import {createContext} from 'react';
import {HtmlManager} from './manager';

export const HtmlContext = createContext(new HtmlManager());
