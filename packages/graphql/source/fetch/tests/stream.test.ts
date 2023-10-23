import {describe, it, expect, vi} from 'vitest';
import {TransformStream} from 'stream/web';

import {graphql} from '../../gql.ts';
import {createGraphQLStreamingFetchOverHTTP} from '../stream.ts';

describe('createGraphQLStreamingFetchOverHTTP()', () => {
  it('returns a promise for a JSON response', async () => {
    const result = {data: {message: 'Hello world!'}};
    const response = new Response(JSON.stringify(result), {
      status: 200,
      headers: {'Content-Type': 'application/json'},
    });

    const fetch = createGraphQLStreamingFetchOverHTTP({
      url: 'https://example.com/graphql',
      fetch: () => Promise.resolve(response),
    });

    const query = graphql`
      query {
        message
      }
    `;

    expect(await fetch(query)).toMatchObject({
      ...result,
      errors: undefined,
      extensions: undefined,
    });
  });

  it('yields a single result for a JSON response', async () => {
    const result = {data: {message: 'Hello world!'}};
    const response = new Response(JSON.stringify(result), {
      status: 200,
      headers: {'Content-Type': 'application/json'},
    });

    const fetch = createGraphQLStreamingFetchOverHTTP({
      url: 'https://example.com/graphql',
      fetch: () => Promise.resolve(response),
    });

    const query = graphql`
      query {
        message
      }
    `;

    const spy = vi.fn();

    for await (const result of fetch(query)) {
      spy(result);
    }

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenLastCalledWith(result);
  });

  it('yields incremental results for a multipart response', async () => {
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    const result = {data: {message: 'Hello world!'}};

    const response = new Response(stream.readable as any, {
      status: 200,
      headers: {'Content-Type': 'multipart/mixed'},
    });

    const encoder = new TextEncoder();

    writer.write(
      encoder.encode(
        `---\r\nContent-Type: application/json\r\n\r\n${JSON.stringify({
          data: {},
          hasNext: true,
        })}\r\n---`,
      ),
    );

    writer.write(
      encoder.encode(
        `\r\nContent-Type: application/json\r\n\r\n${JSON.stringify({
          incremental: [{...result, path: []}],
          hasNext: false,
        })}\r\n------`,
      ),
    );

    writer.close();

    const fetch = createGraphQLStreamingFetchOverHTTP({
      url: 'https://example.com/graphql',
      fetch: () => Promise.resolve(response),
    });

    const query = graphql`
      query {
        ... on Query @defer {
          message
        }
      }
    `;

    const spy = vi.fn();

    for await (const result of fetch(query)) {
      // The function mutates the result, so we have to create a copy
      // we can check later.
      spy({...result});
    }

    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenNthCalledWith(1, {
      data: {},
      errors: undefined,
      incremental: undefined,
      hasNext: true,
    });
    expect(spy).toHaveBeenNthCalledWith(2, {
      ...result,
      errors: undefined,
      incremental: [{...result, path: []}],
      hasNext: false,
    });
  });

  it('returns a promise for the final result of a multipart response', async () => {
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    const result = {data: {message: 'Hello world!'}};

    const response = new Response(stream.readable as any, {
      status: 200,
      headers: {'Content-Type': 'multipart/mixed'},
    });

    const encoder = new TextEncoder();

    writer.write(
      encoder.encode(
        `---\r\nContent-Type: application/json\r\n\r\n${JSON.stringify({
          data: {},
          hasNext: true,
        })}\r\n---`,
      ),
    );

    writer.write(
      encoder.encode(
        `\r\nContent-Type: application/json\r\n\r\n${JSON.stringify({
          incremental: [{...result, path: []}],
          hasNext: false,
        })}\r\n------`,
      ),
    );

    writer.close();

    const fetch = createGraphQLStreamingFetchOverHTTP({
      url: 'https://example.com/graphql',
      fetch: () => Promise.resolve(response),
    });

    const query = graphql`
      query {
        ... on Query @defer {
          message
        }
      }
    `;

    expect(await fetch(query)).toStrictEqual({
      ...result,
      errors: undefined,
      extensions: undefined,
    });
  });
});
