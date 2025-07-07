---
'@quilted/threads': major
---

Consolidate all window-related thread helpers into `ThreadWindow`.

Previously, this library provided separate `ThreadIframe`, `ThreadNestedIframe`, and `ThreadNestedWindow` classes, which attempted to work with `ThreadWindow` to intelligently connect two different browser windows. It applied some custom logic on top of a default `Thread` implementation to ensure the “nested” window loaded before the parent could send messages to it. However, this logic got in the way of many helpful cases, and made the library significantly more complex.

This change consolidates all window-related thread helpers into `ThreadWindow`, removing the `ThreadNestedWindow`, `ThreadIframe`, and `ThreadNestedIframe` classes. With this change, you also now take more responsibility: the library will never attempt to ensure the target is ready to receive messages. You should only start a thread once you are certain the target is ready to receive messages. One common way to achieve this is to have the “parent”, which opens a child window, only provide `exports`, which the “child” window is responsible to call in order to start the conversation.

The following example shows how can you use this pattern when creating a thread between a parent window and a nested iframe:

```ts
import {ThreadWindow} from '@quilted/threads';

// Main thread:

const iframe = document.querySelector('iframe#my-iframe');
const thread = ThreadWindow.iframe.exports(iframe, {
  connect() {
    return {message: 'Hello world!'};
  },
});

// Inside the iframe:

import {ThreadWindow} from '@quilted/threads';

const {connect} = ThreadWindow.parent.imports();
const {message} = await connect();
```

Similarly, you can use this pattern when creating a thread between a parent window and a popup or separate tab:

```ts
import {ThreadWindow} from '@quilted/threads';

// Main thread:

const popup = window.open('https://my-app.com/popup', 'MyAppPopup', 'popup');
ThreadWindow.export(popup, {
  connect() {
    return {message: 'Hello world!'};
  },
});

// Inside the popup:

import {ThreadWindow} from '@quilted/threads';

const {connect} = ThreadWindow.opener.import();
const {message} = await connect();
```
