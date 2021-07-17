import {
  CacheControl,
  ResponseHeader,
  ContentSecurityPolicy,
} from '@quilted/quilt/http';

export function Http() {
  return (
    <>
      <CacheControl cache={false} />
      <ContentSecurityPolicy
        defaultSources={["'self'"]}
        frameAncestors={false}
        upgradeInsecureRequests
      />

      {/**
       * Disables Google’s Federated Learning of Cohorts (“FLoC”)
       * tracking initiative.
       *
       * @see https://www.eff.org/deeplinks/2021/03/googles-floc-terrible-idea
       */}
      <ResponseHeader name="Permissions-Policy" value="interest-cohort=()" />
    </>
  );
}
