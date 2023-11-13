# `@quilted/threads`

Helpers for communicating between JavaScript environments using message passing. This makes it easy to offload expensive work to sandboxed environments, like [web workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers), [iframes](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe), and [WebSockets](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket).

## Installation

```bash
# npm
npm install @quilted/threads --save
# pnpm
pnpm install @quilted/threads --save
# yarn
yarn add @quilted/threads
```

## Usage

### Creating a "thread"

A "thread" in this library represents a target JavaScript environment that can be communicated with via message passing. Each thread can expose a set of methods that are callable from other threads. This library provides helpers for creating threads from a number of common web platform objects:

```ts
// Create a thread from a web worker.
import {createThreadFromWebWorker} from '@quilted/threads';

const worker = new Worker('worker.js');
const thread = createThreadFromWebWorker(worker);

// If you are creating a thread from inside a web worker, pass `self` instead:
const thread = createThreadFromWebWorker(self);

// Create a thread from a target iframe. This is usually done from a top-level
// page, after it has constructed nested iframes.
import {createThreadFromIframe} from '@quilted/threads';

const iframe = document.querySelector('iframe#my-iframe');
const thread = createThreadFromIframe(iframe);

// Create a thread from within a nested iframe.
import {createThreadFromInsideIframe} from '@quilted/threads';

const thread = createThreadFromInsideIframe();

// Create a thread from a WebSocket.
import {createThreadFromBrowserWebSocket} from '@quilted/threads';

const socket = new WebSocket('ws://localhost:8080');
const thread = createThreadFromBrowserWebSocket(socket);

// Create a thread from a MessagePort.
import {createThreadFromMessagePort} from '@quilted/threads';

const {port1, port2} = new MessageChannel();
const thread1 = createThreadFromMessagePort(port1);

// Create a thread from a BroadcastChannel.
import {createThreadFromBroadcastChannel} from '@quilted/threads';

const channel = new BroadcastChannel('my-channel');
const thread = createThreadFromBroadcastChannel(channel);
```

To expose methods on a thread, pass them as an `expose` option to your thread creation function:

```ts
import {createThreadFromWebWorker} from '@quilted/threads';

// We are in a nested worker, and we’ll expose a single `add()` method to
// a paired thread.
const thread = createThreadFromWebWorker(self, {
  expose: {
    add(a: number, b: number) {
      return a + b;
    },
  },
});
```

The `Thread` object returned by each of these functions returns an object that you can use to call methods on the paired thread. Because these methods are asynchronous, these "proxy methods" will always return a promise for the result of calling the exposed function.

```ts
import {createThreadFromWebWorker} from '@quilted/threads';

// We are on the top-level page, so we create our worker, wrap it in a thread,
// and call its exposed method.
const worker = new Worker('worker.js');
const thread = createThreadFromWebWorker(worker);

const result = await thread.add(1, 2);
// result === 3
```

Threads will continue listening and sending messages indefinitely. To stop a thread, you can pass an [`AbortSignal`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal) to the `signal` option on any thread creation function:

```ts
import {createThreadFromWebWorker} from '@quilted/threads';

const abort = new AbortController();
const worker = new Worker('worker.js');
const thread = createThreadFromWebWorker(worker, {signal: abort.signal});

const result = await thread.doWork();

abort.abort();
worker.terminate();
```

### Restrictions on thread functions

Not all types of arguments are supported for functions proxied via message passing by `@quilted/threads`. Only the following simple types can be used:

- Strings, numbers, `true`, `false`, `null`, and `undefined`
- Objects whose keys and values are all simple types
- Arrays whose values are all simple types
- Functions, but they will become asynchronous when proxied, and all functions accepted by arguments in those functions, or returned as part of return values, will have the same argument limitations (also note the [memory management implications of functions](#memory-management) detailed below)

This excludes many types, but of particular note are the following restrictions:

- No `WeakMap` or `WeakSet`
- No `ArrayBuffer` or typed arrays
- Instances of classes will transfer, but only their own properties — that is, properties on their prototype chain **will not** be transferred (additionally, no effort is made to preserve `instanceof` or similar checks on the transferred value)

### Memory management

Implementing functions using message passing always leaks memory. The implementation in this library involves storing a unique identifier for each function sent between sibling threads. When this identifier is received by the sibling, it recognizes it as a “function identifier”. It then maps this function to its existing representation for that ID (if it has been sent before), or creates a new function for it. This function, when called, will send a message to the original source of the function, listing the ID of the function to call (alongside the arguments and other metadata). However, because the two environments need to be able to reference the function and its proxy by ID, it can never release either safely.

`@quilted/threads` implements some smart defaults that make memory management a little easier. By default, a function is only retained for the lifetime of its “parent” — the function call that caused the function to be passed. Let’s look at an example of a thread that accepts a function (here, as the `user.fullName` method):

```ts
import {createThreadFromWebWorker} from '@quilted/threads';

const thread = createThreadFromWebWorker(self, {
  expose: {sayHello},
});

interface User {
  fullName(): string | Promise<string>;
}

async function sayHello(user: User) {
  return `Hey, ${await user.fullName()}!`;
}
```

The paired thread would call this method like so:

```ts
// back on the main thread:

import {createThreadFromWebWorker} from '@quilted/threads';

const worker = new Worker('worker.js');
const thread = createThreadFromWebWorker(worker);

const user = {
  fullName() {
    return 'Winston';
  },
};

const message = await thread.sayHello(user);
console.log(user);
```

A simple implementation would retain the `user.fullName` function forever, even after the `sayHello()` call was long gone, and even if `user` would otherwise have been garbage collected. However, with `@quilted/threads`, this function is automatically released after `sayHello` is done. It does so by marking the function as used (“retained”) when `sayHello` starts, then marking it as unused when `sayHello` is finished. When a function is marked as completely unused, it automatically cleans up after itself by removing the memory in the receiving `Endpoint`, and sending a message to its source `Thread` to release that memory, too.

```ts
async function sayHello(user: User) {
  // user.fullName is retained automatically here
  return `Hey, ${await user.fullName()}!`;
  // just before we finish up and send the message with the result,
  // we release user, which also releases user.fullName
}
```

This automatic behavior is problematic if you want to hold on to a function received via `@quilted/threads` and call it later, after the function that received it has finished. To address this need, this library provides two functions for manual memory management: `retain` and `release`.

#### `retain()`

As noted above, you will `retain()` a value when you want to prevent its automatic release. Calling `retain` will, by default, deeply retain the value — that is, it will traverse into nested array elements and object properties, and retain every `retain`-able thing it finds. You will typically use this alongside also storing that value in a variable that lives outside the context of the function.

```ts
import {retain} from '@quilted/threads';

const allUsers = new Set<User>();

async function sayHello(user: User) {
  allUsers.add(user);
  retain(user);
  return `Hey, ${await user.fullName()}!`;
}
```

Once you have explicitly `retain`ed a value, it will never be released until the `Thread` is terminated, or a matching number of `release()` calls are performed on the object.

#### `release()`

Once you are no longer using the a `retain`-ed value, you must `release` it. Like `retain()`, this function will apply to all nested array elements and object properties.

```ts
import {retain} from '@quilted/threads';

const allUsers = new Set<User>();

function removeUser(user: User) {
  allUsers.delete(user);
  release(user);
}
```

Once an object is fully released, any attempt to call its proxied functions will result in an error.

### Sharing special objects across threads

#### [`AbortSignal`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal)

[`AbortSignal`s](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal) allow you to communicate that an asynchronous operation should stop. Because all methods exposed through `@quilted/threads` are asynchronous, you may find many uses
for `AbortSignal`s. However, it can be a bit tricky to communicate an abort signal across threads yourself. To make this easier, this library provides a pair of utilities to create a "thread-safe" `AbortSignal` on one thread, and to "accept" that signal on another thread. In the thread sending a signal, use the `createThreadAbortSignal()` function from this library, passing it an `AbortSignal`:

```ts
import {
  createThreadFromWebWorker,
  createThreadAbortSignal,
} from '@quilted/threads';

const worker = new Worker('worker.js');
const thread = createThreadFromWebWorker(worker);

const abort = new AbortController();
await thread.calculateResult({signal: createThreadSignal(abort.signal)});
```

On the receiving thread, use the `acceptThreadAbortSignal()` to turn it back into a "live" `AbortSignal`, in the current thread’s JavaScript environment:

```ts
import {
  createThreadFromWebWorker,
  acceptThreadAbortSignal,
  type ThreadAbortSignal,
} from '@quilted/threads';

const thread = createThreadFromWebWorker(self, {
  expose: {calculateResult},
});

function calculateResult({signal: threadSignal}: {signal: ThreadAbortSignal}) {
  const signal = acceptThreadAbortSignal(threadSignal);
  return await figureOutResult({signal});
}
```

#### [Preact signals](https://github.com/preactjs/signals)

[Preact signals](https://github.com/preactjs/signals) are a powerful tool for managing state in JavaScript applications. Signals represent mutable state that can be subscribed to, so they can be useful for sharing state between JavaScript environments connected by `@quilted/threads`. This library provides a collection of helpers for working with signals across threads.

Like the `AbortSignal` utilities documented above, a pair of utilities is provided to create a "thread-safe" Preact signal on one thread, and "accepting" that signal on another thread. In the thread sending a signal, use the `createThreadSignal()` function from this library, passing it a Preact signal:

```ts
import {signal} from '@preact/signals-core';
import {createThreadFromWebWorker} from '@quilted/threads';
import {createThreadSignal} from '@quilted/threads/signals';

const result = signal(32);

const worker = new Worker('worker.js');
const thread = createThreadFromWebWorker(worker);

await thread.calculateResult(createThreadSignal(result));
```

On the receiving thread, use the `acceptThreadSignal()` to turn it back into a "live" Preact signal, in the current thread’s JavaScript environment:

```ts
import {signal} from '@preact/signals-core';
import {createThreadFromWebWorker} from '@quilted/threads';
import {acceptThreadSignal, type ThreadSignal} from '@quilted/threads/signals';

const thread = createThreadFromWebWorker(self, {
  expose: {calculateResult},
});

function calculateResult(resultThreadSignal: ThreadSignal<number>) {
  const result = acceptThreadSignal(resultThreadSignal);
  const correctedResult = await figureOutResult();
  result.value = correctedAge;
}
```

Both `createThreadSignal()` and `acceptThreadSignal()` accept an optional second argument, which must be an options object. The only option accepted is `signal`, which is an `AbortSignal` that allows you to stop synchronizing the Preact signal’s value between threads.
