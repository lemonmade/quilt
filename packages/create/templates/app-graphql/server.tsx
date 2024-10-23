import '@quilted/quilt/globals';

import {RequestRouter, JSONResponse} from '@quilted/quilt/request-router';
import {Router} from '@quilted/quilt/navigation';
import {
  renderAppToHTMLResponse,
  cacheControlHeader,
  contentSecurityPolicyHeader,
  permissionsPolicyHeader,
  strictTransportSecurityHeader,
} from '@quilted/quilt/server';

import Env from 'quilt:module/env';
import {BrowserAssets} from 'quilt:module/assets';

import type {AppContext} from '~/shared/context.ts';

const router = new RequestRouter();
const assets = new BrowserAssets();

// GraphQL API, called from the client
router.post('/api/graphql', async (request) => {
  const [{query, operationName, variables}, {performGraphQLOperation}] =
    await Promise.all([request.json(), import('./server/graphql.ts')]);

  const result = await performGraphQLOperation(query, {
    variables,
    operationName,
  });

  return new JSONResponse(result);
});

// For all GET requests, render our Preact application.
router.get(async (request) => {
  const [{App}, {performGraphQLOperation}, {GraphQLCache}] = await Promise.all([
    import('./App.tsx'),
    import('./server/graphql.ts'),
    import('@quilted/quilt/graphql'),
  ]);

  const context = {
    router: new Router(request.url),
    graphql: {
      fetch: performGraphQLOperation,
      cache: new GraphQLCache({fetch: performGraphQLOperation}),
    },
  } satisfies AppContext;

  const isHttps = request.url.startsWith('https://');

  const response = await renderAppToHTMLResponse(<App context={context} />, {
    request,
    assets,
    headers: {
      // Controls how much information about the current page is included in
      // requests (through the `Referer` header). The default value
      // (strict-origin-when-cross-origin) means that only the origin is included
      // for cross-origin requests, while the origin, path, and querystring
      // are included for same-origin requests.
      //
      // @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Referrer-Policy
      'Referrer-Policy': 'strict-origin-when-cross-origin',

      // Disables the cache for this page, which is generally the best option
      // when dealing with authenticated content. If your site doesn't have
      // authentication, or you have a better cache policy that works for your
      // app or deployment, make sure to update this component accordingly!
      //
      // @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control
      'Cache-Control': cacheControlHeader({
        cache: false,
      }),

      // Sets a strict content security policy for this page. If you load
      // assets from other origins, or want to allow some more dangerous
      // resource loading techniques like `eval`, you can change the
      // `defaultSources` to be less restrictive, or add additional items
      // to the allowlist for more specific directives.
      //
      // @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy
      'Content-Security-Policy': contentSecurityPolicyHeader({
        // By default, only allow sources from the page's origin.
        defaultSources: ["'self'"],
        // In development, allow connections to local websockets for hot reloading.
        connectSources:
          Env.MODE === 'development'
            ? ["'self'", `${isHttps ? 'ws' : 'wss'}://localhost:*`]
            : undefined,
        // Includes `'unsafe-inline'` because CSS is often necessary in development,
        // and can be difficult to avoid in production.
        styleSources: ["'self'", "'unsafe-inline'"],
        // Includes `data:` so that an inline image can be used for the favicon.
        // If you do not use the `emoji` or `blank` favicons in your app, and you
        // do not load any other images as data URIs, you can remove this directive.
        imageSources: ["'self'", 'data:'],
        // Don't allow this page to be rendered as a frame from a different origin.
        frameAncestors: false,
        // Ensure that all requests made by this page are made over https, unless
        // it is being served over http (typically, during local development)
        upgradeInsecureRequests: isHttps,
      }),

      // Sets a strict permissions policy for this page, which limits access
      // to some native browser features.
      //
      // @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Feature-Policy
      'Permissions-Policy': permissionsPolicyHeader({
        // Disables Google's Federated Learning of Cohorts ("FLoC") tracking initiative.
        // @see https://www.eff.org/deeplinks/2021/03/googles-floc-terrible-idea
        interestCohort: false,
        // Don't use synchronous XHRs!
        // @see https://featurepolicy.info/policies/sync-xhr
        syncXhr: false,
        // Disables access to a few device APIs that are infrequently used
        // and prone to abuse. If your application uses these APIs intentionally,
        // feel free to remove the prop, or pass an array containing the origins
        // that should be allowed to use this feature (e.g., `['self']` to allow
        // only the main page's origin).
        camera: false,
        microphone: false,
        geolocation: false,
      }),

      // Instructs browsers to only load this page over HTTPS.
      //
      // @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security
      'Strict-Transport-Security': strictTransportSecurityHeader(),
    },
  });

  return response;
});

export default router;
