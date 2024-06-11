import {describe, it, expect} from 'vitest';

import {renderApp} from '~/tests/render.ts';
import {fillGraphQL, GraphQLController} from '~/tests/graphql.ts';

import Home from '../Home.tsx';
import homeQuery from '../HomeQuery.graphql';

describe('<Home />', () => {
  it('welcomes the user with their name', async () => {
    const name = 'Winston';
    const graphql = new GraphQLController([
      fillGraphQL(homeQuery, {me: {name}}),
    ]);

    const home = await renderApp(<Home />, {graphql});

    expect(graphql).toHavePerformedGraphQLQuery(homeQuery);
    expect(home).toContainPreactText(`Hello ${name}!`);
  });
});
