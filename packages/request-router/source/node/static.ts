import send from 'send';
import type {SendStream} from 'send';
import type {RequestListener} from 'http';

export interface StaticOptions {
  baseUrl?: string;
}

// @see https://github.com/expressjs/serve-static/blob/master/index.js
// @see https://www.npmjs.com/package/send
export function serveStatic(root: string, {baseUrl = '/'}: StaticOptions = {}) {
  const listener: RequestListener = (request, response) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.statusCode = 405;
      response.setHeader('Allow', 'GET, HEAD');
      response.setHeader('Content-Length', '0');
      response.end();
      return;
    }

    const resolvedUrl = new URL(request.url!, 'https://assets.com');
    const {pathname} = resolvedUrl;
    const replacePathname = baseUrl.startsWith('/')
      ? baseUrl
      : new URL(baseUrl, resolvedUrl).pathname;

    const normalizedPathname = pathname.replace(replacePathname, '');

    const stream = send(request, normalizedPathname, {
      root,
      dotfiles: 'ignore',
      index: false,
    });

    stream.on('headers', () => {
      response.setHeader(
        'Cache-Control',
        'public, max-age=31536000, immutable',
      );
    });

    stream.on('directory', function handleDirectory(this: SendStream) {
      this.error(404);
    });

    stream.on('error', (error) => {
      response.statusCode = error.status;
      response.end(error.message);
    });

    stream.pipe(response);
  };

  return listener;
}
