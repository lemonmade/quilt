import {createContext} from 'react';
import type {Signal} from '@quilted/react-signals';

export const AsyncHydratedContext = createContext<Signal<boolean> | null>(null);
