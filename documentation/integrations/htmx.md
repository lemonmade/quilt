# Using [htmx](https://htmx.org)

htmx lets you write complex interactions as part of your HTML content, without needing to hand-write any JavaScript. When using htmx, you just write a backend that responds with HTML, and htmx takes care of applying client-side updates.

If you’re using htmx, you won’t use Preact’s client-side capabilities in your code. However, you can still use Quilt’s [server-side rendering](../features/server-rendering.md) and [request routing](../features/request-routing.md) features to write a backend that responds to htmx’s AJAX requests. Quilt also provides a `@quilted/htmx` package with some handy utilities for writing htmx servers with JavaScript.

To follow this guide, you’ll need a Quilt app with a [custom server](../projects/apps/server.md) and a [custom browser entry](../projects/apps/browser.md).

1. [Install htmx in your project](#install-htmx-in-your-project)
2. [Update your browser entry](#update-your-browser-entry)
3. [Update your server](#update-your-server)
4. [Using HTMX request and response helpers](#using-htmx-request-and-response-helpers)

## Install htmx in your project

Install the `htmx.org` package in your project. If you want to use the custom server utility functions discussed in this guide, you’ll need to install the `@quilted/htmx` package as well.

```bash
pnpm add --save-dev htmx.org @quilted/htmx
```

## Update your browser entry

Quilt’s default browser entrypoint will hydrate your Preact application, so that it becomes interactive on the client. When using htmx, none of this is needed — you just need to load the htmx library and define it globally on the page.

Replace the contents of your browser entry with the following code:

```ts
import htmx from 'htmx.org';

Object.assign(window, {htmx});

// Your assets are loaded with the `async` attribute by default. This bit of code
// ensures that htmx is loaded on your page, even if the browser loads this script
// after the initial HTML is parsed.
htmx.process(document.body);
```

That’s all your browser bundle will contain, and that’s the promise of htmx — your logic lives in the HTML you respond from your server. You’ll update that part, next.

## Update your server

You can write an htmx server in any language. Quilt provides a good foundation for writing applications using TypeScript and Preact, which you can use for generating htmx-compatible HTML responses. Quilt’s [request routing](../features/request-routing.md) and [server-side rendering](../features/server-rendering.md) features can also help you build a server that can run on many different JavaScript runtimes and hosting platforms.

The default Quilt server can be used as-is with htmx; it renders an `App` component, which produces an initial HTML response for the application. Remember: the Preact you render here will **only render on the server, not the client!** You’ll want to update your application to make use of htmx’s attributes to make it interactive on the client.

Let’s imagine a simple application that renders a button, and updates the button’s text when it’s clicked. To accomplish this, you’d need a server with two endpoints: the root HTML document, and an extra `/clicked` endpoint that returns the updated button HTML:

```tsx
import '@quilted/quilt/globals';
import {RequestRouter} from '@quilted/quilt/request-router';
import {
  renderToResponse,
  renderToFragmentResponse,
} from '@quilted/quilt/server';
import {BrowserAssets} from 'quilt:module/assets';

const router = new RequestRouter();
const assets = new BrowserAssets();

// For the root URL, we’ll render a full HTML document
router.get('/', async (request) => {
  // `renderToResponse()` takes care of rendering your app to an HTML stream,
  // wrapping it in a full HTML document (including the browser script that
  // contains htmx), and applying the [HTML-](../features/html.md) and
  // [HTTP-](../features/http.md) directives in your application to the HTML
  // response.
  //
  // This helper does wrap your application in a `<div id="app">` element. If you
  // don’t want that wrapper, you can instead use the `assets` object to get the
  // list of browser assets, and construct an HTML response yourself.
  const response = await renderToResponse(<App />, {
    request,
    assets,
  });

  return response;
});

function App() {
  return (
    <div>
      <p>My app</p>
      <button hx-post="/clicked" hx-swap="outerHTML">
        Click me!
      </button>
    </div>
  );
}

// When clicking the button, htmx will send a POST request to this `/clicked`
// endpoint.
router.post('/clicked', async (request) => {
  // This helper renders a React element to an HTML response, without wrapping
  // a full HTML document around it. htmx will replace the outerHTML of the button
  // with the content of this response, thanks to to the `hx-swap` attribute.
  const response = await renderToFragmentResponse(<ClickedButton />, {
    request,
  });
  return response;
});

function ClickedButton() {
  return <button>Clicked!</button>;
}

export default router;
```

## Using HTMX request and response helpers

HTMX sends [special headers on requests to your application](https://htmx.org/docs/#request-headers), and you can control client-side behaviors by sending [special headers on your responses](https://htmx.org/docs/#response-headers) back to the client. Quilt’s [`@quilted/htmx` package](/integrations/htmx/) provides some helpers for working with these headers. You don’t have to use these helpers, but they can make it a little easier to handle the value of these headers in your JavaScript server.

In the following example, we are using Quilt’s utility to parse the `HX-Trigger` request header, which contains the ID of the element that triggered a request. We’re then using the `Response` subclass, `HTMXResponse`, which lets us easily set the `HX-Retarget` response header in order to configure the response to replace the entire body.

```tsx
import '@quilted/quilt/globals';
import {RequestRouter} from '@quilted/quilt/request-router';
import {renderToResponse} from '@quilted/quilt/server';
import {parseHTMXRequestHeaders, HTMXResponse} from '@quilted/htmx';
import {BrowserAssets} from 'quilt:module/assets';

const router = new RequestRouter();
const assets = new BrowserAssets();

router.get('/', async (request) => {
  const response = await renderToResponse(<App />, {
    request,
    assets,
  });

  return response;
});

function App() {
  return (
    <>
      <button id="one" hx-post="/choose">
        Option one
      </button>
      <button id="two" hx-post="/choose">
        Option two
      </button>
    </>
  );
}

router.post('/choose', async (request) => {
  const {trigger} = parseHTMXRequestHeaders(request.headers);

  if (trigger == null) {
    return new HTMXResponse(`<div>You didn’t choose an option!</div>`);
  }

  return new HTMXResponse(`<div>You chose option: ${trigger}</div>`, {
    htmx: {
      target: 'body',
    },
  });
});

export default router;
```
