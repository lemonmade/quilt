// @ts-ignore
import * as Module from '@quilted/magic-module/worker';

import {createEndpointFromWorker} from '../worker';

const endpoint = createEndpointFromWorker();
endpoint.expose(Module);
