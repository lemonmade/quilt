import {isSupported} from 'caniuse-api';
import type {PolyfillFeature} from './types';

interface PolyfillDescriptor {
  featureTest?: string;
}

const POLYFILLS: {
  [Polyfill in Exclude<PolyfillFeature, 'base'>]: PolyfillDescriptor;
} = {
  fetch: {
    featureTest: 'fetch',
  },
  'abort-controller': {
    featureTest: 'abortcontroller',
  },
  crypto: {
    featureTest: 'cryptography',
  },
};

export function polyfillAliasesForTarget(
  target: 'node' | string[],
  {
    features = ['base', ...(Object.keys(POLYFILLS) as PolyfillFeature[])],
    polyfill = 'usage',
    package: packageName = '@quilted/polyfills',
  }: {
    features?: PolyfillFeature[];
    polyfill?: 'entry' | 'usage' | 'inline';
    package?: string;
  } = {},
): Partial<Record<PolyfillFeature, string>> {
  const noop = `${packageName}/noop`;

  const mappedPolyfills: Partial<Record<PolyfillFeature, string>> = {};

  for (const feature of features) {
    if (feature === 'base') {
      mappedPolyfills[feature] =
        polyfill === 'usage' ? noop : `${packageName}/base`;
      continue;
    }

    const {featureTest} = POLYFILLS[feature];

    mappedPolyfills[feature] =
      target === 'node' ||
      featureTest == null ||
      !isSupported(featureTest, target)
        ? `${packageName}/${feature}`
        : noop;
  }

  return mappedPolyfills;
}
