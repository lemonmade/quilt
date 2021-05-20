// @ts-ignore
import * as Module from '@quilted/magic-module/worker';

import {endpoint} from '../worker';

if (endpoint == null) {
  throw new Error(`This file can only be imported in a worker context.`);
}

endpoint!.expose(Module);
