import {createContext} from 'react';

import type {ServerRenderManager} from './manager';

export const ServerRenderManagerContext =
  createContext<ServerRenderManager | null>(null);
