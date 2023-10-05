---
'@quilted/graphql': major
---

Rename GraphQL HTTP fetch functions

The `createGraphQLHttpFetch()` function has been renamed to `createGraphQLFetchOverHTTP()`, and the `createGraphQLHttpStreamingFetch()` function has been renamed to `createGraphQLStreamingFetchOverHTTP()`. Their supporting `Options` and `Context` types have also been updated with matching names.

```ts
import {
  createGraphQLHttpFetch,
  type GraphQLHttpFetchOptions,
} from '@quilted/graphql';

// becomes:

import {
  createGraphQLFetchOverHTTP,
  type GraphQLFetchOverHTTPOptions,
} from '@quilted/graphql';
```

This change is being made as part of a larger effort to use uppercase letters for acronyms and initialisms.
