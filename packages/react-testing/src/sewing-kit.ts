import {createProjectPlugin} from '@quilted/sewing-kit';
import type {} from '@quilted/sewing-kit-jest';

export type Environment = 'react' | 'react-dom' | 'preact';

export interface Options {
  /**
   * Controls how imports for `@quilted/react-testing` and `@quilted/react-testing/dom`
   * are aliased in your test environment:
   *
   * - When set to `react`, or left unspecified, no aliasing is done, and the real
   *   version of react will be used for tests. This is our recommended option, even
   *   if your application uses Preact at runtime, as it allows you to run your tests
   *   without a mock DOM, which tends to speed them up a lot.
   * - When set to `preact`, any use of `@quilted/react-testing(/dom)` will map to
   *   `@quilted/react-testing/preact`. Use this option if you feel more comfortable
   *   with your test environment using the same rendering library as your runtime
   *   environment.
   * - When set to `react-dom`, any use of `@quilted/react-testing` will map to
   *   `@quilted/react-testing/dom` (and, as a result, will have all the DOM-specific
   *   helpers), and the test environment will be set to `jsdom` to ensure the mock
   *   browser environment is available.
   */
  environment?: Environment;
}

export function reactTesting({environment = 'react'}: Options = {}) {
  return createProjectPlugin({
    name: 'Quilt.Testing',
    test({configure}) {
      // If they want to use react proper, the default `@quilted/react-testing`
      // import is already correct, and we do not need to adjust it any further.
      if (environment === 'react') return;

      configure(({jestModuleMapper, jestEnvironment}) => {
        jestEnvironment?.((currentJestEnvironment) => {
          // If they want either preact or react-dom, they need to use the jsdom
          // environment. Otherwise, leave the environment unchanged.
          switch (environment) {
            case 'react-dom':
            case 'preact':
              return 'jsdom';
            default:
              return currentJestEnvironment;
          }
        });

        jestModuleMapper?.((moduleMappers) => {
          switch (environment) {
            // If they explicitly select react-dom, we will map the main
            // `@quilted/react-testing` import to the DOM version, so all tests
            // have access to the DOM helpers
            case 'react-dom': {
              moduleMappers['^@quilted/react-testing$'] =
                '@quilted/react-testing/dom';
              break;
            }
            case 'preact': {
              // If they explicitly select preact, we will alias all imports of
              // the library to the Preact version.
              moduleMappers['^@quilted/react-testing$'] =
                '@quilted/react-testing/preact';
              moduleMappers['^@quilted/react-testing/dom$'] =
                '@quilted/react-testing/preact';
              break;
            }
          }

          return moduleMappers;
        });
      });
    },
  });
}
