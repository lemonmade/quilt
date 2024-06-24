import {describe, it, expect} from 'vitest';

import {RequestRouter} from '../router.ts';
import {NoContentResponse} from '../response-helpers.ts';

describe('RequestRouter', () => {
  it('can register a handler for any method and path', async () => {
    const response = new NoContentResponse();
    const router = new RequestRouter();
    router.any(() => response);

    expect(await router.fetch(new Request(url('/')))).toBe(response);
    expect(await router.fetch(new Request(url('/any-path')))).toBe(response);
  });

  it('can register a handler for a specific method', async () => {
    const response = new NoContentResponse();
    const router = new RequestRouter();
    router.get(() => response);

    expect(await router.fetch(new Request(url('/'), {method: 'GET'}))).toBe(
      response,
    );
    expect(
      await router.fetch(new Request(url('/'), {method: 'POST'})),
    ).toBeUndefined();
  });

  it('can register a handler for a string path', async () => {
    const response = new NoContentResponse();
    const router = new RequestRouter();
    router.get('/', () => response);

    expect(await router.fetch(new Request(url('/')))).toBe(response);
    expect(
      await router.fetch(new Request(url('/not-a-match'))),
    ).toBeUndefined();
  });

  it('can register a handler for a regular expression path', async () => {
    const response = new NoContentResponse();
    const router = new RequestRouter();
    router.get(/\d+/, () => response);

    expect(await router.fetch(new Request(url('/123')))).toBe(response);
    expect(await router.fetch(new Request(url('/hello')))).toBeUndefined();
  });

  it('can register a handler for a non-exact match', async () => {
    const response = new NoContentResponse();
    const router = new RequestRouter();
    router.get('/hello', () => response, {exact: false});

    expect(await router.fetch(new Request(url('/')))).toBeUndefined();
    expect(await router.fetch(new Request(url('/hello')))).toBe(response);
    expect(await router.fetch(new Request(url('/hello/world')))).toBe(response);
  });

  it('excludes a prefix before attempting to match', async () => {
    const response = new NoContentResponse();
    const router = new RequestRouter({base: '/hello'});
    router.get('/world', () => response);

    expect(await router.fetch(new Request(url('/hello/world')))).toBe(response);
    expect(
      await router.fetch(new Request(url('/hello/goodbye'))),
    ).toBeUndefined();
    expect(await router.fetch(new Request(url('/world')))).toBeUndefined();
  });

  it('expands matches in nested http routers', async () => {
    const response = new NoContentResponse();
    const router = new RequestRouter();
    const nestedRouter = new RequestRouter();
    nestedRouter.get('world', () => response);
    router.get('hello', nestedRouter);

    expect(await router.fetch(new Request(url('/hello/world')))).toBe(response);
    expect(
      await router.fetch(new Request(url('/hello/goodbye'))),
    ).toBeUndefined();
    expect(await router.fetch(new Request(url('/world')))).toBeUndefined();
  });

  it('expands matches and prefixes in nested http routers', async () => {
    const response = new NoContentResponse();
    const router = new RequestRouter();
    const nestedRouter = new RequestRouter({base: '/world'});
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
