# `@quilted/htmx`

Handy utilities for writing [htmx](https://htmx.org) servers using JavaScript.

## Installation

```bash
# npm
npm install @quilted/htmx --save
# pnpm
pnpm install @quilted/htmx --save
# yarn
yarn add @quilted/htmx
```

## Usage

### `parseHTMXRequestHeaders()`

Parses the [HTMX request headers](https://htmx.org/docs/#request-headers) into an easy-to-use JavaScript object. If the request does not contain the mandatory HTMX headers, this function will return `undefined`.

```ts
import {parseHTMXRequestHeaders} from '@quilted/htmx';

const headers = new Headers();
headers.set('HX-Request', 'true');
headers.set('HX-Current-URL', 'https://my-website.com');
headers.set('HX-Trigger', 'my-button');

const parsed = parseHTMXRequestHeaders(headers);
// {currentURL: new URL('https://my-website.com'), trigger: 'my-button'}
```

### `HTMXRequest`

`HTMXRequest` is a subclass of the `Request` constructor and Quilt’s `EnhancedRequest`, which adds automatic parsing of the cookie header and request URL. This request constructor automatically parses the headers using `parseHTMXRequestHeaders()`, and stores the result in the `htmx` property. If this request does not have the necessary headers, `HTMXRequest` will throw.

```ts
export default function fetch(request: Request) {
  const htmxRequest = new HTMXRequest(request);
  const {trigger} = htmxRequest.htmx;

  if (trigger == null) {
    return new Response('No trigger found', {status: 400});
  }

  return new Response(`Trigger: ${trigger}`);
}
```

### `setHTMXResponseHeaders()`

Applies the [HTMX response headers](https://htmx.org/docs/#response-headers) from an easy-to-use JavaScript object.

```ts
import {setHTMXResponseHeaders} from '@quilted/htmx';

const headers = new Headers();

const parsed = setHTMXResponseHeaders(headers, {
  target: 'body',
  trigger: ['my-event'],
  triggerAfterSettle: [
    {
      event: 'my-after-settle-event',
      detail: {foo: 'bar'},
    },
  ],
});
```

### `HTMXResponse`

`HTMXResponse` is a subclass of the `Response` constructor and Quilt’s `EnhancedResponse`, which adds cookie-related utilities. This request constructor automatically sets the HTMX headers using `setHTMXResponseHeaders()`.

```ts
import {HTMXResponse} from '@quilted/htmx';

export default function fetch() {
  return new HTMXResponse('Here’s your new content!', {
    htmx: {
      target: 'body',
      trigger: ['my-event'],
      triggerAfterSettle: [
        {
          event: 'my-after-settle-event',
          detail: {foo: 'bar'},
        },
      ],
    },
  });
}
```
