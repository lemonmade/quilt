# `@quilted/events`

Tiny helpers for working with events in any JavaScript environment.

## Installation

```bash
# npm
npm install @quilted/events --save
# pnpm
pnpm install @quilted/events --save
# yarn
yarn add @quilted/events
```

## Usage

### Emitting and listening for events

This library provides an `EventEmitter` class, which is the main utility you’ll use to work with events. It’s similar to the browser’s [`EventTarget` interface](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget), but instead of accepting only callbacks to listen for events, it turns events into other JavaScript types.

To get started, you can create a new `EventEmitter` instance, passing it a type argument that describes the events that can be triggered, and their allowed data type:

```ts
import {EventEmitter} from '@quilted/events';

const events = new EventEmitter<{message: string}>();
```

Unlike `EventTarget`’s single `addEventListener()` method, the `EventEmitter` class provides two different methods for dealing with events. The `on()` method returns an [`AsyncGenerator`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/AsyncGenerator) that will yield the data for each matching event:

```ts
import {EventEmitter} from '@quilted/events';

const events = new EventEmitter<{message: string}>();

for await (const message of events.on('message')) {
  console.log('Message received:', message);
}
```

The `once()` method, on the other hand, returns a [`Promise`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) that will resolve with the data for the first matching event:

```ts
import {EventEmitter} from '@quilted/events';

const events = new EventEmitter<{message: string}>();

const message = await events.once('message');
console.log('Message received:', message);
```

Both `on()` and `once()` accept an [`AbortSignal`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal) option as their second argument, which allows you to cancel the listener. By default, aborting `on()` will cause the async generator to end stop yielding values, and will cause `once()` to resolve its promise with `undefined`. However, you can also pass an `abort` option set to `'reject'` in order to have these method instead reject with `AbortError`s:

```ts
import {EventEmitter} from '@quilted/events';

const events = new EventEmitter<{message: string}>();
const abortController = new AbortController();

// Abort this listener in 10 seconds
setTimeout(() => {
  abortController.abort();
}, 10_000);

try {
  const message = await events.once('message', {
    signal: abortController.signal,
    abort: 'reject',
  });

  console.log('Message received:', message);
} catch (error) {
  console.log('Promise rejected:', error);
}
```

When working in Node, the browser, and other environments, you may already have an object capable of receiving events, and want to convert those events to promises and async generators, like the `EventEmitter` class. You can wrap any object conforming to the [`EventTarget`](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget) or [Node.js `EventEmitter`](https://nodejs.org/api/events.html#class-eventemitter) interfaces with an `EventEmitter` to get this functionality:

```ts
import {EventEmitter} from '@quilted/events';

// HTML elements implement `EventTarget`
const button = document.querySelector('button');
const events = new EventEmitter(button);

for await (const event of events.on('click')) {
  console.log('Button clicked!', event);
}
```

You can also use the `on()` and `once()` functions provided by this library to do one-off event listeners:

```ts
import {once} from '@quilted/events';

const button = document.querySelector('button');
const event = await once(button, 'click');
console.log('Button clicked!', event);
```
