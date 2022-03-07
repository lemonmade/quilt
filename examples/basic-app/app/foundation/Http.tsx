import {
  CacheControl,
  ResponseHeader,
  ResponseCookie,
  ContentSecurityPolicy,
  PermissionsPolicy,
  StrictTransportSecurity,
} from '@quilted/quilt/http';

export function Http() {
  return (
    <>
      <ResponseCookie name="user" value="Chris" />

      {/**
       * Disables the cache for this page, which is generally the best option
       * when dealing with authenticated content. If your site doesn’t have
       * authentication, or you have a better cache policy that works for your
       * app or deployment, make sure to update this component accordingly!
       *
       * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control
       */}
      <CacheControl cache={false} />

      {/**
       * Sets a strict content security policy for this page. If you load
       * assets from other origins, or want to allow some more dangerous
       * resource loading techniques like `eval`, you can change the
       * `defaultSources` to be less restrictive, or add additional items
       * to the allowlist for more specific directives.
       *
       * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy
       */}
      <ContentSecurityPolicy
        // By default, only allow sources from the page’s origin.
        defaultSources={["'self'"]}
        // Includes `data:` so that an inline image can be used for the favicon.
        // If you do not use the `emoji` or `blank` favicons in your app, and you
        // do not load any other images as data URIs, you can remove this directive.
        imageSources={["'self'", 'data:']}
        // Don’t allow this page to be rendered as a frame from a different origin.
        frameAncestors={false}
        // Ensure that all requests made by this page are made over https.
        upgradeInsecureRequests
      />

      {/**
       * Sets a strict permissions policy for this page, which limits access
       * to some native browser features.
       *
       * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Feature-Policy
       */}
      <PermissionsPolicy
        // Disables Google’s Federated Learning of Cohorts (“FLoC”) tracking initiative.
        // @see https://www.eff.org/deeplinks/2021/03/googles-floc-terrible-idea
        interestCohort={false}
        // Don’t use synchronous XHRs!
        // @see https://featurepolicy.info/policies/sync-xhr
        syncXhr={false}
        // Disables access to a few device APIs that are infrequently used
        // and prone to abuse. If your application uses these APIs intentionally,
        // feel free to remove the prop, or pass an array containing the origins
        // that should be allowed to use this feature (e.g., `['self']` to allow
        // only the main page’s origin).
        camera={false}
        microphone={false}
        geolocation={false}
      />

      {/**
       * Instructs browsers to only load this page over HTTPS using the
       * `Strict-Transport-Security` header.
       *
       * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security
       */}
      <StrictTransportSecurity />

      {/**
       * Controls how much information about the current page is included in
       * requests (through the `Referer` header). The default value
       * (strict-origin-when-cross-origin) means that only the origin is included
       * for cross-origin requests, while the origin, path, and querystring
       * are included for same-origin requests.
       *
       * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Referrer-Policy
       */}
      <ResponseHeader
        name="Referrer-Policy"
        value="strict-origin-when-cross-origin"
      />

      {/**
       * Instructs browsers to respect the MIME type in the `Content-Type` header.
       *
       * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Content-Type-Options
       */}
      <ResponseHeader name="X-Content-Type-Options" value="nosniff" />
    </>
  );
}
