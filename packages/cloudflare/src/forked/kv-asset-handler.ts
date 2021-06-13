// This module is a kind of simplified version of https://github.com/cloudflare/kv-asset-handler.
// Until the fix for https://github.com/cloudflare/kv-asset-handler/issues/174
// is released, that module doesn’t really support the module worker format.
// This module uses most of the patterns/ code from the original library,
// but with a guestimate of the eventual module-friendly API that I can use
// today.

import mime from 'mime';

export type KVNamespaceBinding = any;

export interface WorkerRequestContext {
  waitUntil(promise: Promise<any>): void;
}

interface CacheControl {
  browserTTL?: number | null;
  edgeTTL?: number | null;
  bypassCache?: boolean;
}

interface GetAssetOptions {
  ASSET_NAMESPACE: KVNamespaceBinding;
  cacheControl?: CacheControl;
  mapRequestToAsset?(request: Request): Request;
}

const defaultCacheControl: CacheControl = {
  browserTTL: null,
  edgeTTL: 2 * 60 * 60 * 24, // 2 days
  bypassCache: false, // do not bypass Cloudflare's cache
};

export class KVError extends Error {
  constructor(message?: string, status = 500) {
    super(message);
    // see: typescriptlang.org/docs/handbook/release-notes/typescript-2-2.html
    Object.setPrototypeOf(this, new.target.prototype); // restore prototype chain
    this.name = KVError.name; // stack traces display correctly now
    this.status = status;
  }
  status: number;
}

export class MethodNotAllowedError extends KVError {
  constructor(message = `Not a valid request method`, status = 405) {
    super(message, status);
  }
}

export class NotFoundError extends KVError {
  constructor(message = `Not Found`, status = 404) {
    super(message, status);
  }
}

export class InternalError extends KVError {
  constructor(message = `Internal Error in KV Asset Handler`, status = 500) {
    super(message, status);
  }
}

function defaultMapRequestToAsset(request: Request) {
  return request;
}

export {defaultMapRequestToAsset as mapRequestToAsset};

export async function getAssetFromKV(
  request: Request,
  ctx: WorkerRequestContext,
  {
    ASSET_NAMESPACE,
    cacheControl: explicitCacheControl = defaultCacheControl,
    mapRequestToAsset = defaultMapRequestToAsset,
  }: GetAssetOptions,
): Promise<Response> {
  const requestKey = mapRequestToAsset(request);

  const SUPPORTED_METHODS = ['GET', 'HEAD'];
  if (!SUPPORTED_METHODS.includes(requestKey.method)) {
    throw new MethodNotAllowedError(
      `${requestKey.method} is not a valid request method`,
    );
  }

  const parsedUrl = new URL(requestKey.url);
  const {pathname} = parsedUrl;

  // pathKey is the file path to look up in the manifest
  const pathKey = pathname.replace(/^\/+/, ''); // remove prepended /

  // @ts-expect-error Workers gonna worker
  const cache = caches.default;
  let mimeType = mime.getType(pathKey) ?? 'text/plain';
  if (mimeType.startsWith('text') || mimeType === 'application/javascript') {
    mimeType += '; charset=utf-8';
  }

  let shouldEdgeCache = false;

  // TODO this excludes search params from cache, investigate ideal behavior
  const cacheKey = new Request(`${parsedUrl.origin}/${pathKey}`, request);

  // formats the etag depending on the response context. if the entityId
  // is invalid, returns an empty string (instead of null) to prevent the
  // the potentially disastrous scenario where the value of the Etag resp
  // header is "null". Could be modified in future to base64 encode etc
  const formatETag = (entityId: any = pathKey, validatorType = 'strong') => {
    if (!entityId) {
      return '';
    }
    switch (validatorType) {
      case 'weak':
        if (!entityId.startsWith('W/')) {
          return `W/${entityId}`;
        }
        return entityId;
      case 'strong':
        if (entityId.startsWith(`W/"`)) {
          entityId = entityId.replace('W/', '');
        }
        if (!entityId.endsWith(`"`)) {
          entityId = `"${entityId}"`;
        }
        return entityId;
      default:
        return '';
    }
  };

  const cacheControl = {...defaultCacheControl, ...explicitCacheControl};

  // override shouldEdgeCache if options say to bypassCache
  if (
    cacheControl.bypassCache ||
    cacheControl.edgeTTL === null ||
    request.method == 'HEAD'
  ) {
    shouldEdgeCache = false;
  }

  // only set max-age if explicitly passed in a number as an arg
  const shouldSetBrowserCache = typeof cacheControl.browserTTL === 'number';

  let response = null;
  if (shouldEdgeCache) {
    response = await cache.match(cacheKey);
  }

  if (response) {
    if (response.status > 300 && response.status < 400) {
      if (response.body && 'cancel' in Object.getPrototypeOf(response.body)) {
        response.body.cancel();
        // eslint-disable-next-line no-console
        console.log(
          'Body exists and environment supports readable streams. Body cancelled',
        );
      } else {
        // eslint-disable-next-line no-console
        console.log('Environment doesnt support readable streams');
      }
      response = new Response(null, response);
    } else {
      // fixes #165
      const opts = {
        headers: new Headers(response.headers),
        status: 0,
        statusText: '',
      };

      opts.headers.set('cf-cache-status', 'HIT');

      if (response.status) {
        opts.status = response.status;
        opts.statusText = response.statusText;
      } else if (opts.headers.has('Content-Range')) {
        opts.status = 206;
        opts.statusText = 'Partial Content';
      } else {
        opts.status = 200;
        opts.statusText = 'OK';
      }
      response = new Response(response.body, opts);
    }
  } else {
    // HUGE HACK ALERT: this is the biggest divergence from the mainline
    // library. In the mainline version, there is an `ASSET_MANIFEST` mapping
    // that goes from the files as they were named locally, to the name of the
    // file that Cloudflare uploads, which includes an additional fingerprint
    // in the URL. This manifest is not provided in the module version. Until
    // that mapping is provided, or there is a way to disable fingerprinting
    // (which we don’t need, since we already fingerprint the assets), this
    // code gets the asset by finding all keys by its prefix (the whole filename
    // on local disk, minus the extension) which is also the prefix for the
    // fingerprinted version in Cloudflare's KV store.
    const {
      keys: [foundAsset],
    } = await ASSET_NAMESPACE.list({
      prefix: pathKey.replace(/\.\w+$/, ''),
      limit: 1,
    });

    const body = foundAsset
      ? await ASSET_NAMESPACE.get(foundAsset.name, 'arrayBuffer')
      : null;

    if (body === null) {
      throw new NotFoundError(
        `could not find ${pathKey} in your content namespace`,
      );
    }
    response = new Response(body);

    if (shouldEdgeCache) {
      response.headers.set('Accept-Ranges', 'bytes');
      response.headers.set('Content-Length', body.length);
      // set etag before cache insertion
      if (!response.headers.has('etag')) {
        response.headers.set('etag', formatETag(pathKey, 'strong'));
      }
      // determine Cloudflare cache behavior
      response.headers.set('Cache-Control', `max-age=${cacheControl.edgeTTL}`);
      ctx.waitUntil(cache.put(cacheKey, response.clone()));
      response.headers.set('CF-Cache-Status', 'MISS');
    }
  }
  response.headers.set('Content-Type', mimeType);

  if (response.status === 304) {
    const etag = formatETag(response.headers.get('etag'), 'strong');
    const ifNoneMatch = cacheKey.headers.get('if-none-match');
    const proxyCacheStatus = response.headers.get('CF-Cache-Status');
    if (etag) {
      if (ifNoneMatch && ifNoneMatch === etag && proxyCacheStatus === 'MISS') {
        response.headers.set('CF-Cache-Status', 'EXPIRED');
      } else {
        response.headers.set('CF-Cache-Status', 'REVALIDATED');
      }
      response.headers.set('etag', formatETag(etag, 'weak'));
    }
  }
  if (shouldSetBrowserCache) {
    response.headers.set('Cache-Control', `max-age=${cacheControl.browserTTL}`);
  } else {
    response.headers.delete('Cache-Control');
  }
  return response;
}
