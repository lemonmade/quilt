import React from 'react';

import {ServerRenderManager} from './manager';

export const ServerRenderContext = React.createContext<ServerRenderManager | null>(
  null,
);
