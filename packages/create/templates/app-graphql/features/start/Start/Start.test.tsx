import {describe, it, expect} from 'vitest';

import {renderApp} from '~/tests/render.ts';
import {fillGraphQL, GraphQLController} from '~/tests/graphql.ts';

import Start from './Start.tsx';
import startQuery from './StartQuery.graphql';

describe('<Start />', () => {
  it('welcomes the user with their name', async () => {
    const name = 'Winston';
    const graphql = new GraphQLController([
      fillGraphQL(startQuery, {me: {name}}),
    ]);

    const start = await renderApp(<Start />, {graphql});

    expect(graphql).toHavePerformedGraphQLQuery(startQuery);
    expect(start).toContainPreactText(`Hello ${name}!`);
  });
});
