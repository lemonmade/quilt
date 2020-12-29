import {isSupported} from 'caniuse-api';

interface PolyfillDescriptor {
  featureTest?: string;
}

const POLYFILLS: {[polyfill: string]: PolyfillDescriptor} = {
  fetch: {
    featureTest: 'fetch',
  },
};

export function mappedPolyfillsForEnv({
  target,
  polyfill = 'entry',
}: {
  target: 'node' | string[];
  polyfill?: 'entry' | 'usage' | 'inline';
}): {[key: string]: string} {
  const prefix = `@quilted/polyfills`;
  const noop = `${prefix}/noop`;

  return Object.entries(POLYFILLS).reduce<{[key: string]: string}>(
    (mappedPolyfills, [polyfill, {featureTest}]) => {
      const mapFrom = `@quilted/polyfills/${polyfill}$`;

      if (target === 'node') {
        mappedPolyfills[mapFrom] = `${prefix}/${polyfill}.${target}`;
      } else {
        mappedPolyfills[mapFrom] =
          featureTest == null || !isSupported(featureTest, target)
            ? `${prefix}/${polyfill}.browser`
            : noop;
      }

      return mappedPolyfills;
    },
    {
      '@quilted/polyfills/base$':
        polyfill === 'usage' ? noop : `${prefix}/base`,
    },
  );
}
