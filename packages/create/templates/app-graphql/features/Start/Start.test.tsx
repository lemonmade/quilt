import {describe, it, expect} from '@quilted/quilt/testing';

import {
  renderApp,
  fillGraphQL,
  createGraphQLController,
} from '~/tests/render.tsx';

import Start from './Start.tsx';
import startQuery from './StartQuery.graphql';

describe('<Start />', () => {
  it('welcomes the user with their name', async () => {
    const name = 'Winston';
    const graphql = createGraphQLController(fillGraphQL(startQuery, {name}));

    const start = await renderApp(<Start />, {graphql});

    expect(graphql).toHavePerformedGraphQLOperation(startQuery);
    expect(start).toContainReactText(`Hello ${name}!`);
  });
});
