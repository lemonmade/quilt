---
'@quilted/graphql': minor
'@quilted/quilt': patch
'@quilted/react-graphql': patch
---

Added per-fetch setting of all GraphQL HTTP options, and added new settings for request `extensions` and `source`.

By default, the operation source is sent in all HTTP requests: as the `query` parameter for `GET` requests, and as the `query` body field for `POST` requests. To accomplish "persisted" GraphQL queries, you may want to send only the hashed identifier of a GraphQL operation, rather than the entire source. You can disable sending the source for all GraphQL fetches by setting `source: false` when creating your `fetch()` function:

```ts
// This all applies for createGraphQLHttpStreamingFetch, too
import {createGraphQLHttpFetch} from '@quilted/graphql';

// Importing `.graphql` files automatically generates hashed
// identifiers for your operations. If you don’t use this feature,
// you must pass the identifier yourself.
import myQuery from './MyQuery.graphql';

const fetch = createGraphQLHttpFetch({
  source: false,
  url: 'https://my-app.com/query',
});

const {data} = await fetch(myQuery);
```

This isn’t typically useful unless you also communicate the operation’s hash identifier. Here’s an example showing how you could pass the identifier as an additional URL parameter:

```ts
import {createGraphQLHttpFetch} from '@quilted/graphql';
import myQuery from './MyQuery.graphql';

const fetch = createGraphQLHttpFetch({
  source: false,
  url(operation) {
    const url = new URL('https://my-app.com/query');
    url.searchParams.set('id', operation.id);
    return url;
  },
});

const {data} = await fetch(myQuery);
```

Here’s an alternative approach, which sends the operation using a GraphQL `extensions` field, according to Apollo’s [automatic persisted queries protocol](https://www.google.com/search?client=safari&rls=en&q=apollo+autoamtic+persisted+queries&ie=UTF-8&oe=UTF-8):

```ts
import {createGraphQLHttpFetch} from '@quilted/graphql';
import myQuery from './MyQuery.graphql';

const fetch = createGraphQLHttpFetch({
  source: false,
  url: 'https://my-app.com/query',
  extensions(operation) {
    return {
      persistedQuery: {version: 1, sha256Hash: operation.id},
    };
  },
});

const {data} = await fetch(myQuery);
```

These `source` and `extension` options can be set globally, as shown above, or per-fetch:

```ts
import {createGraphQLHttpFetch} from '@quilted/graphql';
import myQuery from './MyQuery.graphql';

const fetch = createGraphQLHttpFetch({
  url: 'https://my-app.com/query',
});

const {data} = await fetch(myQuery, {
  source: false,
  extensions: {
    persistedQuery: {version: 1, sha256Hash: myQuery.id},
  },
});
```

You can also now set the `method`, `url`, and `headers` options per fetch. The example below shows how you can set the `method` to `GET` for a single GraphQL operation:

```ts
import {createGraphQLHttpFetch} from '@quilted/graphql';

const fetch = createGraphQLHttpFetch({
  url: 'https://my-app.com/query',
});

const {data} = await fetch(`{ me { name } }`, {
  // Default is POST, but this query will run as a GET
  method: 'GET',
});
```
