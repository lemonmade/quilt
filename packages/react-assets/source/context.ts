import {createContext} from 'react';
import {AssetsManager} from './manager.ts';

export const AssetsContext = createContext(new AssetsManager<any>());
