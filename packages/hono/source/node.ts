import * as path from 'node:path';
import {fileURLToPath} from 'node:url';
import type {IncomingMessage, ServerResponse} from 'node:http';

import type {Hono} from 'hono';
import {serve, getRequestListener} from '@hono/node-server';
import {
  serveStatic,
  type ServeStaticOptions,
} from '@hono/node-server/serve-static';

export {serve, serveStatic};

export async function handleRequest(
  app: Hono,
  incomingMessage: IncomingMessage,
  serverResponse: ServerResponse,
) {
  const listener = getRequestListener(app.fetch);
  await listener(incomingMessage, serverResponse);
}

export function serveStaticAppAssets(
  from: string | URL,
  {
    directory = '../assets',
    base = '/assets/',
    ...options
  }: {directory?: string; base?: string} & Omit<
    ServeStaticOptions,
    'root'
  > = {},
) {
  const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base;

  return serveStatic({
    root: path.relative(
      process.cwd(),
      path.isAbsolute(directory)
        ? directory
        : path.join(path.dirname(fileURLToPath(from)), directory),
    ),
    rewriteRequestPath(path) {
      return path.slice(normalizedBase.length);
    },
    onFound(_, c) {
      // Default to immutable caching for assets
      c.header('Cache-Control', 'public, max-age=31536000, immutable');
    },
    ...options,
  });
}
