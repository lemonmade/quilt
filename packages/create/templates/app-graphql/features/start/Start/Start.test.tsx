import {describe, it, expect} from '@quilted/quilt/testing';

import {renderApp} from '~/tests/render.ts';
import {fillGraphQL, GraphQLController} from '~/tests/graphql.ts';

import Start from './Start.tsx';
import startQuery from './StartQuery.graphql';

describe('<Start />', () => {
  it('welcomes the user with their name', async () => {
    const name = 'Winston';
    const graphql = new GraphQLController([fillGraphQL(startQuery, {name})]);

    const start = await renderApp(<Start />, {graphql});

    expect(graphql).toHavePerformedGraphQLQuery(startQuery);
    expect(start).toContainReactText(`Hello ${name}!`);
  });
});
