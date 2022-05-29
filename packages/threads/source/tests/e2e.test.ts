import {describe, it, expect} from '@quilted/testing';
import {createThread, targetFromMessagePort} from '..';
import {MessageChannel} from './utiltiies';

describe('thread', () => {
  it('calls the exposed API over a message channel', async () => {
    interface EndpointApi {
      hello(): string;
    }

    const {port1, port2} = new MessageChannel();
    const threadOne = createThread<Record<string, never>, EndpointApi>(
      targetFromMessagePort(port1),
    );

    createThread<EndpointApi>(targetFromMessagePort(port2), {
      expose: {hello: () => 'world'},
    });

    expect(await threadOne.hello()).toBe('world');
  });

  it('proxies function calls', async () => {
    interface EndpointApi {
      greet(getName: () => string): string;
    }

    const {port1, port2} = new MessageChannel();
    const threadOne = createThread<Record<string, never>, EndpointApi>(
      targetFromMessagePort(port1),
    );

    createThread<EndpointApi>(targetFromMessagePort(port2), {
      expose: {
        greet: async (getName) => `Hello, ${await getName()}!`,
      },
    });

    expect(await threadOne.greet(() => 'Chris')).toBe('Hello, Chris!');
  });

  it('proxies generators', async () => {
    interface EndpointApi {
      iterate(): Generator<number, void, void>;
    }

    const {port1, port2} = new MessageChannel();
    const threadOne = createThread<Record<string, never>, EndpointApi>(
      targetFromMessagePort(port1),
    );

    let yielded = 0;
    let expected = 0;

    createThread<EndpointApi>(targetFromMessagePort(port2), {
      expose: {
        *iterate() {
          while (yielded < 5) {
            yield ++yielded;
          }
        },
      },
    });

    for await (const value of threadOne.iterate()) {
      expect(value).toBe(++expected);
    }
  });

  it('proxies async generators', async () => {
    interface EndpointApi {
      iterate(): AsyncGenerator<number, void, void>;
    }

    const {port1, port2} = new MessageChannel();
    const threadOne = createThread<Record<string, never>, EndpointApi>(
      targetFromMessagePort(port1),
    );

    let yielded = 0;
    let expected = 0;

    createThread<EndpointApi>(targetFromMessagePort(port2), {
      expose: {
        async *iterate() {
          while (yielded < 5) {
            yield ++yielded;
          }
        },
      },
    });

    for await (const value of threadOne.iterate()) {
      expect(value).toBe(++expected);
    }
  });

  it('throws errors when calling methods on terminated threads', async () => {
    interface EndpointApi {
      greet(): string;
    }

    const abort = new AbortController();

    const {port1, port2} = new MessageChannel();
    const threadOne = createThread<Record<string, never>, EndpointApi>(
      targetFromMessagePort(port1),
      {signal: abort.signal},
    );

    createThread<EndpointApi>(targetFromMessagePort(port2), {
      expose: {
        greet: () => 'Hello, world!',
      },
    });

    abort.abort();

    await expect(threadOne.greet()).rejects.toBeInstanceOf(Error);
  });

  it('rejects all in-flight requests when a thread terminates', async () => {
    interface EndpointApi {
      greet(): string;
    }

    const abort = new AbortController();

    const {port1, port2} = new MessageChannel();
    const threadOne = createThread<Record<string, never>, EndpointApi>(
      targetFromMessagePort(port1),
      {signal: abort.signal},
    );

    createThread<EndpointApi>(targetFromMessagePort(port2), {
      expose: {
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        greet: () => new Promise(() => {}),
      },
    });

    const result = threadOne.greet();

    abort.abort();

    await expect(result).rejects.toBeInstanceOf(Error);
  });

  it('rejects all in-flight requests when a target thread terminates', async () => {
    interface EndpointApi {
      greet(): string;
    }

    const abort = new AbortController();

    const {port1, port2} = new MessageChannel();
    const threadOne = createThread<Record<string, never>, EndpointApi>(
      targetFromMessagePort(port1),
    );

    createThread<EndpointApi>(targetFromMessagePort(port2), {
      signal: abort.signal,
      expose: {
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        greet: () => new Promise(() => {}),
      },
    });

    const result = threadOne.greet();

    abort.abort();

    await expect(result).rejects.toBeInstanceOf(Error);
  });
});
