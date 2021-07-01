import {CacheControl, ResponseHeader} from '@quilted/quilt/http';

export function Http() {
  return (
    <>
      <CacheControl cache={false} />

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
