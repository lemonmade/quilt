import type {Hono} from 'hono';
import {serve, getRequestListener} from '@hono/node-server';
import {serveStatic} from '@hono/node-server/serve-static';
import type {IncomingMessage, ServerResponse} from 'http';

export {serve, serveStatic};

export async function handleRequest(
  app: Hono,
  incomingMessage: IncomingMessage,
  serverResponse: ServerResponse,
) {
  const listener = getRequestListener(app.fetch);
  await listener(incomingMessage, serverResponse);
}
