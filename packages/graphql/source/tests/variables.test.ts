import {describe, it, expect, vi} from 'vitest';

import {graphql} from '../gql.ts';
import {GraphQLQuery} from '../GraphQLQuery.ts';
import {GraphQLMutation} from '../GraphQLMutation.ts';
import type {GraphQLFetch, GraphQLResult} from '../index.ts';

const greetingQuery = graphql<{greeting: string}, {name?: string} | undefined>`
  query Greeting($name: String) {
    greeting(name: $name)
  }
`;

const pingMutation = graphql<{ping: boolean}, Record<string, never>>`
  mutation Ping {
    ping
  }
`;

function deferredFetch<Data>() {
  let resolve!: (value: GraphQLResult<Data>) => void;
  const promise = new Promise<GraphQLResult<Data>>((res) => {
    resolve = res;
  });
  const fetch = vi.fn(
    () => promise as Promise<GraphQLResult<any>>,
  ) as unknown as GraphQLFetch<any> & {mock: {calls: unknown[]}};
  return {fetch, resolve};
}

function trackedFetch<Data>(value: GraphQLResult<Data>) {
  const fetch = vi.fn(async () => value) as unknown as GraphQLFetch<any> & {
    mock: {calls: unknown[]};
  };
  return fetch;
}

describe('GraphQLQuery', () => {
  it('reuses the in-flight run when a subsequent call passes {} after no variables', async () => {
    const {fetch, resolve} = deferredFetch<{greeting: string}>();
    const action = new GraphQLQuery(greetingQuery, {fetch});

    const first = action.run();
    const second = action.run({});

    expect(second).toBe(first);

    resolve({data: {greeting: 'hello'}});
    await first;

    expect(fetch.mock.calls).toHaveLength(1);
  });

  it('reuses the in-flight run when a subsequent call passes no variables after {}', async () => {
    const {fetch, resolve} = deferredFetch<{greeting: string}>();
    const action = new GraphQLQuery(greetingQuery, {fetch});

    const first = action.run({});
    const second = action.run();

    expect(second).toBe(first);

    resolve({data: {greeting: 'hello'}});
    await first;

    expect(fetch.mock.calls).toHaveLength(1);
  });

  it('starts a new run when the variables actually change', async () => {
    const fetch = trackedFetch<{greeting: string}>({
      data: {greeting: 'hello'},
    });
    const action = new GraphQLQuery(greetingQuery, {fetch});

    const first = action.run({name: 'Winston'});
    const second = action.run({name: 'Molly'});

    expect(second).not.toBe(first);
    await Promise.allSettled([first, second]);
    expect(fetch.mock.calls).toHaveLength(2);
  });
});

describe('GraphQLMutation', () => {
  it('reuses the in-flight run when a subsequent call passes {} after no variables', async () => {
    const {fetch, resolve} = deferredFetch<{ping: boolean}>();
    const action = new GraphQLMutation(pingMutation, {fetch});

    const first = action.run();
    const second = action.run({});

    expect(second).toBe(first);

    resolve({data: {ping: true}});
    await first;

    expect(fetch.mock.calls).toHaveLength(1);
  });
});
