import {describe, it, expect} from 'vitest';
import {CacheControl, ContentSecurityPolicy} from '@quilted/quilt/http';

import {renderApp} from '~/tests/render.ts';

import {Headers} from './Headers.tsx';

describe('<Headers />', () => {
  it('does not cache the response', async () => {
    const headers = await renderApp(<Headers />);

    expect(headers).toContainReactComponent(CacheControl, {
      cache: false,
    });
  });

  it('adds a content security policy with a strict default policy', async () => {
    const headers = await renderApp(<Headers />);

    expect(headers).toContainReactComponent(ContentSecurityPolicy, {
      defaultSources: ["'self'"],
    });
  });
});
