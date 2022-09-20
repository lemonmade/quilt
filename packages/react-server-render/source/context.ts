import {createOptionalContext} from '@quilted/react-utilities';

import type {ServerRenderManager} from './manager';

export const ServerRenderManagerContext =
  createOptionalContext<ServerRenderManager>();
