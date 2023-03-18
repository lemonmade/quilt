import {createContext} from 'react';
import {AssetsManager} from './manager';

export const AssetsContext = createContext(new AssetsManager<any>());
