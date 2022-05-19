import type {IncomingMessage, ServerResponse} from 'http';

export interface NodeRequestContext {
  readonly request: IncomingMessage;
  readonly response: ServerResponse;
}

declare module '../types' {
  interface RequestContext extends NodeRequestContext {}
}
