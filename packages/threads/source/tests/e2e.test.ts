import {describe, it, expect, vi} from 'vitest';
import {ThreadMessagePort} from '../index.ts';
import {MessageChannel} from './utilities.ts';

describe('thread', () => {
  it('calls the exposed API over a message channel', async () => {
    interface ThreadAPI {
      hello(): Promise<string>;
    }

    const {port1, port2} = new MessageChannel();
    const thread1 = new ThreadMessagePort<ThreadAPI>(port1);

    new ThreadMessagePort<{}, ThreadAPI>(port2, {
      exports: {hello: async () => 'world'},
    });

    expect(await thread1.imports.hello()).toBe('world');
  });

  it('proxies function calls', async () => {
    interface ThreadAPI {
      greet(getName: () => Promise<string>): Promise<string>;
    }

    const {port1, port2} = new MessageChannel();
    const thread1 = new ThreadMessagePort<ThreadAPI>(port1);

    new ThreadMessagePort<{}, ThreadAPI>(port2, {
      exports: {
        greet: async (getName) => `Hello, ${await getName()}!`,
      },
    });

    expect(await thread1.imports.greet(async () => 'Chris')).toBe(
      'Hello, Chris!',
    );
  });

  it('proxies generators', async () => {
    interface ThreadAPI {
      iterate(): AsyncGenerator<number, void, void>;
    }

    const {port1, port2} = new MessageChannel();
    const thread1 = new ThreadMessagePort<ThreadAPI>(port1);

    let yielded = 0;
    let expected = 0;

    new ThreadMessagePort<{}, ThreadAPI>(port2, {
      exports: {
        async *iterate() {
          while (yielded < 5) {
            yield ++yielded;
          }
        },
      },
    });

    for await (const value of thread1.imports.iterate()) {
      expect(value).toBe(++expected);
    }
  });

  it('proxies async generators', async () => {
    interface ThreadAPI {
      iterate(): AsyncGenerator<number, void, void>;
    }

    const {port1, port2} = new MessageChannel();
    const thread1 = new ThreadMessagePort<ThreadAPI>(port1);

    let yielded = 0;
    let expected = 0;

    new ThreadMessagePort<{}, ThreadAPI>(port2, {
      exports: {
        async *iterate() {
          while (yielded < 5) {
            yield ++yielded;
          }
        },
      },
    });

    for await (const value of thread1.imports.iterate()) {
      expect(value).toBe(++expected);
    }

    expect(expected).toBe(5);
  });

  it('proxies basic JavaScript types', async () => {
    interface OneOfEverything {
      string: string;
      number: number;
      boolean: boolean;
      null: null;
      undefined: undefined;
      set: Set<any>;
      map: Map<any, any>;
      regexp: RegExp;
      date: Date;
      url: URL;
      array: any[];
      error: Error;
      uint8Array: Uint8Array;
      uint16Array: Uint16Array;
      uint32Array: Uint32Array;
    }

    interface ThreadAPI {
      oneOfEverything(options: OneOfEverything): Promise<void>;
    }

    const {port1, port2} = new MessageChannel();
    const thread1 = new ThreadMessagePort<ThreadAPI>(port1);

    const spy = vi.fn();

    new ThreadMessagePort<{}, ThreadAPI>(port2, {
      exports: {
        oneOfEverything: spy,
      },
    });

    const oneOfEverything: OneOfEverything = {
      string: 'string',
      number: 42,
      boolean: true,
      null: null,
      undefined: undefined,
      set: new Set([1, 2, 3]),
      map: new Map([
        ['one', 1],
        ['two', 2],
      ]),
      regexp: /regexp/,
      date: new Date(),
      url: new URL('https://example.com'),
      array: [1, 2, 3],
      error: new Error('error'),
      uint8Array: new Uint8Array([1]),
      uint16Array: new Uint16Array([257]),
      uint32Array: new Uint32Array([65536]),
    };

    await thread1.imports.oneOfEverything(oneOfEverything);

    expect(spy).toHaveBeenCalledWith(oneOfEverything);
  });

  it('proxies complex object types', async () => {
    interface ThreadAPI {
      respondWithArray(array: Uint8Array): Promise<Uint8Array>;
    }

    const {port1, port2} = new MessageChannel();
    const thread1 = new ThreadMessagePort<ThreadAPI>(port1);

    new ThreadMessagePort<{}, ThreadAPI>(port2, {
      exports: {
        async respondWithArray(array) {
          return array;
        },
      },
    });

    const array = new Uint8Array([1, 2, 3, 4, 5]);
    const response = await thread1.imports.respondWithArray(array);
    expect(response).toBeInstanceOf(Uint8Array);
    expect(response).toStrictEqual(array);
  });

  it('throws errors when calling methods on terminated threads', async () => {
    interface ThreadAPI {
      greet(): Promise<string>;
    }

    const abort = new AbortController();

    const {port1, port2} = new MessageChannel();
    const thread1 = new ThreadMessagePort<ThreadAPI>(port1, {
      signal: abort.signal,
    });

    new ThreadMessagePort<{}, ThreadAPI>(port2, {
      exports: {
        greet: async () => 'Hello, world!',
      },
    });

    abort.abort();

    await expect(thread1.imports.greet()).rejects.toBeInstanceOf(Error);
  });

  it('rejects all in-flight requests when a thread terminates', async () => {
    interface ThreadAPI {
      greet(): Promise<string>;
    }

    const abort = new AbortController();

    const {port1, port2} = new MessageChannel();
    const thread1 = new ThreadMessagePort<ThreadAPI>(port1, {
      signal: abort.signal,
    });

    new ThreadMessagePort<{}, ThreadAPI>(port2, {
      exports: {
        greet: () => new Promise(() => {}),
      },
    });

    const result = thread1.imports.greet();

    abort.abort();

    await expect(result).rejects.toBeInstanceOf(Error);
  });
});
