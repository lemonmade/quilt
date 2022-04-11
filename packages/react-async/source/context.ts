import {createContext} from 'react';
import type {AsyncAssetManager} from './assets';

export const AsyncAssetContext = createContext<AsyncAssetManager | null>(null);
