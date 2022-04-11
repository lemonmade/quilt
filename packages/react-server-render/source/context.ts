import {createContext} from 'react';

import type {ServerRenderManager} from './manager';

export const ServerRenderContext = createContext<ServerRenderManager | null>(
  null,
);
