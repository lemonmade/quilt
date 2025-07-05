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

### Creating a thread

A "thread" in this library represents a target JavaScript environment that can be communicated with via message passing. Typically, the object wrapped in a thread will have use [use a `postMessage()` API](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage) for communicating serialized messages between environments. A thread augments this serializable message passing with the ability to seamlessly call functions on the paired thread.

This library provides utilities for creating threads from a variety of common JavaScript objects:

`ThreadWebWorker` creates a thread from a [web worker](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers):

```ts
import {ThreadWebWorker} from '@quilted/threads';

const worker = new Worker('worker.js');
const thread = ThreadWebWorker.from(worker);

// Inside the web worker:

const thread = ThreadWebWorker.from(self);
// Equivalent to:
const thread = ThreadWebWorker.self();
```

`ThreadIFrame` creates a thread from an [iframe](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe), and `ThreadNestedIFrame` creates a thread from within a nested iframe:

```ts
import {ThreadIFrame} from '@quilted/threads';

const iframe = document.querySelector('iframe#my-iframe');
const thread = ThreadIFrame.from(iframe);

// Inside the iframe:

import {ThreadIframe} from '@quilted/threads';

const thread = ThreadIframe.parent();
```

`ThreadWindow` creates a thread from a [`Window` object](https://developer.mozilla.org/en-US/docs/Web/API/Window), like a popup window, and `ThreadNestedWindow` creates a thread from within that nested window:

```ts
// Create a thread from a target Window. This is usually done from a top-level
// page, after it has called `window.open()`.
import {ThreadWindow} from '@quilted/threads';

const popup = window.open('https://my-app.com/popup', 'MyAppPopup', 'popup');
const thread = ThreadWindow.from(popup);

// Inside the opened window:

import {ThreadWindow} from '@quilted/threads';

const thread = ThreadWindow.opener();
```

`ThreadBrowserWebSocket` creates a thread from a [WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket):

```ts
import {ThreadBrowserWebSocket} from '@quilted/threads';

const socket = new WebSocket('ws://localhost:8080');
const thread = ThreadBrowserWebSocket.from(socket);
```

`ThreadMessagePort` creates a thread from a [MessagePort](https://developer.mozilla.org/en-US/docs/Web/API/MessagePort):

```ts
// Create a thread from a MessagePort.
import {ThreadMessagePort} from '@quilted/threads';

const {port1, port2} = new MessageChannel();
const thread1 = ThreadMessagePort.from(port1);
```

`ThreadBroadcastChannel` creates a thread from a [BroadcastChannel](https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel):

```ts
// Create a thread from a BroadcastChannel.
import {ThreadBroadcastChannel} from '@quilted/threads';

const channel = new BroadcastChannel('my-channel');
const thread = ThreadBroadcastChannel.from(channel);
```

`ThreadServiceWorker` creates a thread from a [ServiceWorker](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API), and `ThreadsFromServiceWorkerClients` creates a cache that can create threads from [ServiceWorkerClients](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerClient) (typically, a parent `Window`):

```ts
import {ThreadServiceWorker} from '@quilted/threads';

await navigator.serviceWorker.register('/service-worker.js');

if (navigator.serviceWorker.controller) {
  const thread = ThreadServiceWorker.from(navigator.serviceWorker.controller);
}

// Inside the service worker:

import {ThreadsFromServiceWorkerClients} from '@quilted/threads';

const clientThreads = new ThreadsFromServiceWorkerClients();

self.addEventListener('activate', async (event) => {
  const clients = await serviceWorker.clients.matchAll();
  const thread = clientThreads.from(clients[0]);
});
```

### Communicating between threads

Each thread can export a set of methods that are callable from other threads. To expose methods on a thread, pass them as an `exports` option to your thread creation function:

```ts
import {ThreadWebWorker} from '@quilted/threads';

// We are in a nested worker, and we’ll export a single `add()` method to
// a paired thread.
const thread = ThreadWebWorker.from(self, {
  exports: {
    // In reality, you’d usually implement a more computationally-expensive
    // function here!
    async add(a: number, b: number) {
      return a + b;
    },
  },
});
```

The `Thread` instance contains an `imports` object that you can use to call methods on the paired thread. Because these methods are asynchronous, these "proxy imports" will always return a promise for the result of calling the exposed function.

```ts
import {ThreadWebWorker} from '@quilted/threads';

// We are on the top-level page, so we create our worker, wrap it in a thread,
// and call its exposed method.
const worker = new Worker('worker.js');
const thread = ThreadWebWorker.from(worker);

const result = await thread.imports.add(1, 2);
// result === 3
```

If you only need to import from one side of a thread, and only use the exports on the other side, you can use the static `import()` and `export()` methods on the thread class instead, which avoids some unncessary boilerplate in this situation:

```ts
import {ThreadWebWorker} from '@quilted/threads';

// Web Worker:
ThreadWebWorker.export(self, {
  async add(a: number, b: number) {
    return a + b;
  },
});

// Main thread:
const {add} = ThreadWebWorker.import(worker);
const result = await add(1, 2);
```

These helpers are also available as nested methods on `ThreadWebWorker.self`, `ThreadIframe.parent`, and `ThreadWindow.opener`, to easily create these simplified connections from within nested JavaScript contexts:

```ts
import {ThreadWindow} from '@quilted/threads';

// Popup window:
ThreadWindow.opener.export(self, {
  async add(a: number, b: number) {
    return a + b;
  },
});

// Main thread:
const popup = window.open('https://my-app.com/popup', '', 'popup');
const {add} = ThreadWindow.import(popup);
const result = await add(1, 2);
```

Threads will continue listening and sending messages indefinitely. To stop a thread, you can pass an [`AbortSignal`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal) to the `signal` option on any thread creation function:

```ts
import {ThreadWebWorker} from '@quilted/threads';

const abort = new AbortController();
const worker = new Worker('worker.js');
const thread = ThreadWebWorker.from(worker, {signal: abort.signal});

const result = await thread.imports.doWork();

abort.abort();
worker.terminate();
```

Alternatively, you can call the `Thread`’s `close()` method, which stops listening for new messages and cleans up any resources associated with the thread:

```ts
import {ThreadWebWorker} from '@quilted/threads';

const worker = new Worker('worker.js');
const thread = ThreadWebWorker.from(worker);

const result = await thread.imports.doWork();

thread.close();
worker.terminate();
```

### Arguments that can pass between threads

`@quilted/threads` lets you provide a custom object to serialize and deserialize messages sent between threads. These “serializer” objects allow threads to support a wide range of data types, even when communicating over a message passing protocol that supports only a limited set of types.

```ts
import {
  ThreadWebWorker,
  ThreadSerializationStructuredClone,
} from '@quilted/threads';

const worker = new Worker('worker.js');
const thread = ThreadWebWorker.from(worker, {
  serialization: new ThreadSerializationStructuredClone(),
});
```

Depending on the `Thread` class documented above you are using, one of the following serializers will be used:

- `ThreadBrowserWebSocket` will use the `ThreadSerializationJSON` class, which supports all the types supported by [structured cloning](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm), plus `URL` instances, async iterators, and functions.
- All other `Thread` classes documented above will use `ThreadSerializationStructuredClone`, which assumes the underlying object supports the structured cloning algorithm for messages, and adds support for `URL` instances, async iterators, and functions.

In all cases, there are a few types that can’t be communicated between threads:

- `WeakMap` and `WeakSet` instances
- Instances of classes will transfer, but only their own properties — that is, properties on their prototype chain **will not** be transferred (additionally, no effort is made to preserve `instanceof` or similar checks on the transferred value)

### Memory management

Implementing functions using message passing always leaks memory. The implementation in this library involves storing a unique identifier for each function sent between sibling threads. When this identifier is received by the sibling, it recognizes it as a “function identifier”. It then maps this function to its existing representation for that ID (if it has been sent before), or creates a new function for it. This function, when called, will send a message to the original source of the function, listing the ID of the function to call (alongside the arguments and other metadata). However, because the two environments need to be able to reference the function and its proxy by ID, it can never release either safely.

`@quilted/threads` offers a few different techniques for avoiding these kinds of memory leaks. By default, the library will use [`WeakRef`s](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakRef) and a [`FinalizationRegistry`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/FinalizationRegistry) to automatically inform a paired thread when a function that was proxied by the thread is no longer in use. This allows the paired thread to release the memory associated with that function.

Not all environments support the [JavaScript features needed to support automatic memory management](https://caniuse.com/mdn-javascript_builtins_weakref). For these cases, `@quilted/threads` provides an alternative manual memory management technique, which implements some smart defaults that make memory management a little easier. This strategy is enabled by passing the `ThreadFunctionsManualMemoryManagement` class as the `Thread`’s `functions` option:

```ts
import {
  ThreadWebWorker,
  ThreadFunctionsManualMemoryManagement,
} from '@quilted/threads';

const thread = ThreadWebWorker.from(self, {
  functions: new ThreadFunctionsManualMemoryManagement(),
});
```

With `ThreadFunctionsManualMemoryManagement`, a function is only retained for the lifetime of its “parent” — the function call that caused the function to be passed. Let’s look at an example of a thread that accepts a function (here, as the `user.fullName` method):

```ts
import {
  ThreadWebWorker,
  ThreadFunctionsManualMemoryManagement,
} from '@quilted/threads';

const thread = ThreadWebWorker.from(self, {
  exports: {sayHello},
  functions: new ThreadFunctionsManualMemoryManagement(),
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

import {ThreadWebWorker} from '@quilted/threads';

const worker = new Worker('worker.js');
const thread = ThreadWebWorker.from(worker);

const user = {
  fullName() {
    return 'Winston';
  },
};

const message = await thread.imports.sayHello(user);
console.log(user);
```

A simple implementation would retain the `user.fullName` function forever, even after the `sayHello()` call was long gone, and even if `user` would otherwise have been garbage collected. However, with `ThreadFunctionsManualMemoryManagement`, this function is automatically released after `sayHello` is done. It does so by marking the function as used (“retained”) when `sayHello` starts, then marking it as unused when `sayHello` is finished. When a function is marked as completely unused, it automatically cleans up after itself by removing the memory in the receiving `Endpoint`, and sending a message to its source `Thread` to release that memory, too.

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

[`AbortSignal`s](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal) allow you to communicate that an asynchronous operation should stop. Because all methods exposed through `@quilted/threads` are asynchronous, you may find many uses for `AbortSignal`s. However, it can be a bit tricky to communicate an abort signal across threads yourself. To make this easier, this library provides utilities to create a serialized `AbortSignal` on one thread, and to convert that serialized version into a “live” `AbortSignal` on another thread. In the thread sending a signal, use the `ThreadAbortSignal.serialize()` method to serialize your `AbortSignal`:

```ts
import {ThreadWebWorker, ThreadAbortSignal} from '@quilted/threads';

const worker = new Worker('worker.js');
const thread = ThreadWebWorker.from(worker);

const abort = new AbortController();

await thread.imports.calculateResult({
  signal: ThreadSignal.serialize(abort.signal),
});
```

On the receiving thread, use `new ThreadAbortSignal()` to turn it back into a live `AbortSignal`, in the current thread’s JavaScript environment:

```ts
import {
  ThreadWebWorker,
  ThreadAbortSignal,
  type ThreadAbortSignalSerialization,
} from '@quilted/threads';

const thread = ThreadWebWorker.from(self, {
  exports: {calculateResult},
});

function calculateResult({
  signal: threadSignal,
}: {
  signal: ThreadAbortSignalSerialization;
}) {
  const signal = new ThreadAbortSignal(threadSignal);
  return await figureOutResult({signal});
}
```

If you are using [`@quilted/threads`’ manual memory management option](#memory-management), you must explicitly pass [`retain()`](#retain) and [`release()`](#release) functions to `ThreadAbortSignal.serialize()` and `new ThreadAbortSignal()` functions:

```ts
import {
  retain,
  release,
  ThreadWebWorker,
  ThreadAbortSignal,
} from '@quilted/threads';

const worker = new Worker('worker.js');
const thread = ThreadWebWorker.from(worker);

const abort = new AbortController();
await thread.imports.calculateResult({
  signal: ThreadAbortSignal.serialize(abort.signal, {retain, release}),
});

// In the worker:

import {
  retain,
  release,
  ThreadFromWebWorker,
  ThreadAbortSignal,
  type ThreadAbortSignalSerialization,
} from '@quilted/threads';

const thread = new ThreadFromWebWorker(self, {
  exports: {calculateResult},
});

function calculateResult({
  signal: threadSignal,
}: {
  signal: ThreadAbortSignalSerialization;
}) {
  const signal = new ThreadAbortSignal(threadSignal, {retain, release});
  return await figureOutResult({signal});
}
```

#### [Preact signals](https://github.com/preactjs/signals)

[Preact signals](https://github.com/preactjs/signals) are a powerful tool for managing state in JavaScript applications. Signals represent mutable state that can be subscribed to, so they can be useful for sharing state between JavaScript environments connected by `@quilted/threads`. This library provides a collection of helpers for working with signals across threads.

Like the `AbortSignal` utilities documented above, a class is provided for creating a "thread-safe" Preact signal on one thread, and accepting that signal on another thread. In the thread sending a signal, use the `ThreadSignal.serialize()` method to serialize your Preact signal:

```ts
import {signal} from '@preact/signals-core';
import {ThreadWebWorker} from '@quilted/threads';
import {ThreadSignal} from '@quilted/threads/signals';

const result = signal(32);

const worker = new Worker('worker.js');
const thread = ThreadWebWorker.from(worker);

await thread.imports.calculateResult(ThreadSignal.serialize(result));
```

If you want a Preact signal to be writable in the target environment, and have that value propagate to the original signal, you must pass a `writable: true` option to the `ThreadSignal.serialize()` function:

```ts
import {signal} from '@preact/signals-core';
import {ThreadWebWorker} from '@quilted/threads';
import {ThreadSignal} from '@quilted/threads/signals';

const result = signal(32);

const worker = new Worker('worker.js');
const thread = ThreadWebWorker.from(worker);

await thread.imports.calculateResult(
  ThreadSignal.serialize(result, {
    // Allow the target environment to write back to this signal.
    writable: true,
  }),
);
```

On the receiving thread, use `new ThreadSignal()` (or, equivalently, `threadSignal()`) to turn the serialized version back into a "live" Preact signal, in the current thread’s JavaScript environment:

```ts
import {signal} from '@preact/signals-core';
import {ThreadWebWorker} from '@quilted/threads';
import {
  ThreadSignal,
  type ThreadSignalSerialization,
} from '@quilted/threads/signals';

const thread = ThreadWebWorker.from(self, {
  exports: {calculateResult},
});

function calculateResult(serializedSignal: ThreadSignalSerialization<number>) {
  const result = new ThreadSignal(serializedSignal); // or threadSignal(serializedSignal)
  const computedSignal = computed(() => `Result from thread: ${result.value}`);
}
```

Like with `ThreadAbortSignal` documented above, if you are using `@quilted/threads`’ manual memory management approach, you must explicitly pass `retain` and `release` functions to `ThreadSignal.serialize()` and `new ThreadSignal()` functions:

```ts
import {signal} from '@preact/signals-core';
import {ThreadWebWorker} from '@quilted/threads';
import {
  retain,
  release,
  ThreadSignal,
  type ThreadSignalSerialization,
} from '@quilted/threads/signals';

const thread = ThreadWebWorker.from(self, {
  expose: {calculateResult},
});

function calculateResult(serializedSignal: ThreadSignalSerialization<number>) {
  const result = new ThreadSignal(serializedSignal, {
    retain,
    release,
  });
  const computedSignal = computed(() => `Result from thread: ${result.value}`);
}
```

Both `new ThreadSignal()` and `ThreadSignal.serialize()` also accept an optional `signal` option, which is an `AbortSignal` that allows you to stop synchronizing the Preact signal’s value between threads.
