import '@quilted/polyfills/fetch';

import {describe, it, expect} from '@quilted/testing';
import {createRequestRouter} from '../router';
import {noContent} from '../response-helpers';

describe('createRequestRouter()', () => {
  it('can register a handler for any method and path', async () => {
    const response = noContent();
    const router = createRequestRouter();
    router.any(() => response);

    expect(await router.fetch(new Request(url('/')))).toBe(response);
    expect(await router.fetch(new Request(url('/any-path')))).toBe(response);
  });

  it('can register a handler for a specific method', async () => {
    const response = noContent();
    const router = createRequestRouter();
    router.get(() => response);

    expect(await router.fetch(new Request(url('/'), {method: 'GET'}))).toBe(
      response,
    );
    expect(
      await router.fetch(new Request(url('/'), {method: 'POST'})),
    ).toBeUndefined();
  });

  it('can register a handler for a string path', async () => {
    const response = noContent();
    const router = createRequestRouter();
    router.get('/', () => response);

    expect(await router.fetch(new Request(url('/')))).toBe(response);
    expect(
      await router.fetch(new Request(url('/not-a-match'))),
    ).toBeUndefined();
  });

  it('can register a handler for a regular expression path', async () => {
    const response = noContent();
    const router = createRequestRouter();
    router.get(/\d+/, () => response);

    expect(await router.fetch(new Request(url('/123')))).toBe(response);
    expect(await router.fetch(new Request(url('/hello')))).toBeUndefined();
  });

  it('can register a handler for a non-exact match', async () => {
    const response = noContent();
    const router = createRequestRouter();
    router.get('/hello', () => response, {exact: false});

    expect(await router.fetch(new Request(url('/')))).toBeUndefined();
    expect(await router.fetch(new Request(url('/hello')))).toBe(response);
    expect(await router.fetch(new Request(url('/hello/world')))).toBe(response);
  });

  it('excludes a prefix before attempting to match', async () => {
    const response = noContent();
    const router = createRequestRouter({prefix: '/hello'});
    router.get('/world', () => response);

    expect(await router.fetch(new Request(url('/hello/world')))).toBe(response);
    expect(
      await router.fetch(new Request(url('/hello/goodbye'))),
    ).toBeUndefined();
    expect(await router.fetch(new Request(url('/world')))).toBeUndefined();
  });

  it('expands matches in nested http routers', async () => {
    const response = noContent();
    const router = createRequestRouter();
    const nestedRouter = createRequestRouter();
    nestedRouter.get('world', () => response);
    router.get('hello', nestedRouter);

    expect(await router.fetch(new Request(url('/hello/world')))).toBe(response);
    expect(
      await router.fetch(new Request(url('/hello/goodbye'))),
    ).toBeUndefined();
    expect(await router.fetch(new Request(url('/world')))).toBeUndefined();
  });

  it('expands matches and prefixes in nested http routers', async () => {
    const response = noContent();
    const router = createRequestRouter();
    const nestedRouter = createRequestRouter({prefix: 'world'});
    nestedRouter.get('/', () => response);
    router.get('hello', nestedRouter);

    expect(await router.fetch(new Request(url('/hello/world')))).toBe(response);
    expect(
      await router.fetch(new Request(url('/hello/world/beyond'))),
    ).toBeUndefined();
    expect(
      await router.fetch(new Request(url('/hello/goodbye'))),
    ).toBeUndefined();
    expect(await router.fetch(new Request(url('/world')))).toBeUndefined();
  });
});

function url(path: string) {
  return new URL(path, 'https://example.dev');
}
