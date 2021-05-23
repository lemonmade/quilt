/* eslint-disable import/extensions */

// @ts-ignore
import * as Module from '__quilt__/Worker.tsx';

import {endpoint} from '../worker';

if (endpoint == null) {
  throw new Error(`This file can only be imported in a worker context.`);
}

endpoint!.expose(Module);
