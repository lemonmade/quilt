import {CacheControl, ContentSecurityPolicy} from '@quilted/quilt/headers';
import {describe, it, expect} from '@quilted/quilt/testing';

import {renderWithAppContext} from '~/tests/render.tsx';

import {Headers} from './Headers.tsx';

describe('<Headers />', () => {
  it('does not cache the response', async () => {
    const headers = await renderWithAppContext(<Headers />);

    expect(headers).toContainReactComponent(CacheControl, {
      cache: false,
    });
  });

  it('adds a content security policy with a strict default policy', async () => {
    const headers = await renderWithAppContext(<Headers />);

    expect(headers).toContainReactComponent(ContentSecurityPolicy, {
      defaultSources: ["'self'"],
    });
  });
});
