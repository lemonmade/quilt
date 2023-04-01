import {createOptionalContext} from '@quilted/react-utilities';

import type {ServerRenderManager} from './manager.ts';

export const ServerRenderManagerContext =
  createOptionalContext<ServerRenderManager>();
