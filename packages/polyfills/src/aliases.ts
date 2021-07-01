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
};

export function polyfillAliasesForTarget(
  target: 'node' | string[],
  {
    features = ['base', ...(Object.keys(POLYFILLS) as PolyfillFeature[])],
    polyfill = 'usage',
  }: {
    features?: PolyfillFeature[];
    polyfill?: 'entry' | 'usage' | 'inline';
  } = {},
): Record<string, string> {
  const prefix = `@quilted/polyfills`;
  const noop = `${prefix}/noop`;

  const mappedPolyfills: Record<string, string> = {};

  for (const feature of features) {
    if (feature === 'base') {
      mappedPolyfills['@quilted/polyfills/base'] =
        polyfill === 'usage' ? noop : `${prefix}/base`;
      continue;
    }

    const {featureTest} = POLYFILLS[feature];
    const mapFrom = `@quilted/polyfills/${feature}`;

    if (target === 'node') {
      mappedPolyfills[mapFrom] = `${prefix}/${feature}.${target}`;
    } else {
      mappedPolyfills[mapFrom] =
        featureTest == null || !isSupported(featureTest, target)
          ? `${prefix}/${feature}.browser`
          : noop;
    }
  }

  return mappedPolyfills;
}
