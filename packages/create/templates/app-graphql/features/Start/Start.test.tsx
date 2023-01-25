import {describe, it, expect} from '@quilted/quilt/testing';

import {
  mountWithAppContext,
  createGraphQLController,
  fillGraphQL,
} from '~/tests/mount';

import Start from './Start';
import startQuery from './StartQuery.graphql';

describe('<Start />', () => {
  it('welcomes the user with their name', async () => {
    const name = 'Winston';
    const graphql = createGraphQLController(fillGraphQL(startQuery, {name}));

    const start = await mountWithAppContext(<Start />, {graphql});

    expect(graphql).toHavePerformedGraphQLOperation(startQuery);
    expect(start).toContainReactText(`Hello ${name}!`);
  });
});
