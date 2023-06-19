import {CacheControl, ContentSecurityPolicy} from '@quilted/quilt/http';
import {describe, it, expect} from '@quilted/quilt/testing';

import {renderWithAppContext} from '~/tests/render.tsx';

import {Http} from './Http.tsx';

describe('<Http />', () => {
  it('does not cache the response', async () => {
    const http = await renderWithAppContext(<Http />);

    expect(http).toContainReactComponent(CacheControl, {
      cache: false,
    });
  });

  it('adds a content security policy with a strict default policy', async () => {
    const http = await renderWithAppContext(<Http />);

    expect(http).toContainReactComponent(ContentSecurityPolicy, {
      defaultSources: ["'self'"],
    });
  });
});
