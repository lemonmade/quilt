import {describe, it, expect} from 'vitest';
import {
  CacheControl,
  ContentSecurityPolicy,
  SearchRobots,
  Viewport,
} from '@quilted/quilt/server';

import {renderApp} from '~/tests/render.ts';

import {HTML} from './HTML.tsx';

describe('<HTML />', () => {
  it('includes a responsive viewport tag', async () => {
    const head = await renderApp(<HTML />);

    expect(head).toContainPreactComponent(Viewport, {
      cover: true,
    });
  });

  it('prevents search robots from indexing the application', async () => {
    const head = await renderApp(<HTML />);

    expect(head).toContainPreactComponent(SearchRobots, {
      index: false,
      follow: false,
    });
  });

  it('does not cache the response', async () => {
    const headers = await renderApp(<HTML />);

    expect(headers).toContainPreactComponent(CacheControl, {
      cache: false,
    });
  });

  it('adds a content security policy with a strict default policy', async () => {
    const headers = await renderApp(<HTML />);

    expect(headers).toContainPreactComponent(ContentSecurityPolicy, {
      defaultSources: ["'self'"],
    });
  });
});
