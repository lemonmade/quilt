# `@quilted/graphql`

Tiny, type-safe helpers for using GraphQL. This includes helpers for fetching GraphQL queries and mutations, functions to help you create GraphQL resolvers for your server, and utilities for testing projects that depend on GraphQL results.

To provide better integration for GraphQL in your build tools, combine this with [`@quilted/graphql-tools`](../graphql-tools/), or use [Quilt as a framework](../../documentation/features/graphql.md).

## Installation

```bash
# npm
npm install @quilted/graphql --save
# pnpm
pnpm install @quilted/graphql --save
# yarn
yarn add @quilted/graphql
```

## Usage

### Fetching GraphQL queries and mutations

GraphQL is only useful if you can fetch results. This library provides a few helpers for fetching GraphQL results over the most common transport: HTTP. These utilities are focused on being as small as possible — basic GraphQL fetches require only about 1Kb of compressed code, and streaming fetches require only about 2Kb.

If you’re getting started with GraphQL, you probably have a GraphQL server being served over HTTP. The [Quilt GraphQL application template](../../documentation/getting-started.md#app-templates), for example, serves its GraphQL endpoint on `/graphql` of the app’s domain. To create a function that lets you fetch data from an HTTP endpoint like this, use the `createGraphQLHttpFetch()` function:

```tsx
import {createGraphQLHttpFetch} from '@quilted/graphql';

const fetchGraphQL = createGraphQLHttpFetch({url: '/graphql'});
```

The `createGraphQLHttpFetch()` function accepts options to customize the GraphQL request before it is performed. The only required option is `url`, which specifies the URL to send the GraphQL request to. You can also provide `method` and `headers` options to customize the HTTP method and headers, respectively. Each of these options can be a function, which allows you to customize them per-operation:

```tsx
import {createGraphQLHttpFetch} from '@quilted/graphql';

const fetchGraphQL = createGraphQLHttpFetch({
  url(operation) {
    const url = new URL('/graphql');

    if (operation.name) {
      url.searchParams.set('operationName', operation.name);
    }

    return url;
  },
  headers: {
    'Content-Type': 'application/json+graphql',
  },
});
```

The resulting function can be called with a GraphQL query or mutation, and returns a promise that resolves to the data (or errors) returned by the GraphQL server:

```tsx
import {graphql} from '@quilted/graphql';

// `graphql` is optional, it just provides nice syntax highlighting
// in some editors.
const query = graphql`
  query MyQuery {
    # ...
  }
`;

const {data, errors} = await fetchGraphQL(query);
```

You can also provide `variables` to the fetch function, as well as a `signal` to abort the request:

```tsx
try {
  const controller = new AbortController();

  const timeout = window.setTimeout(() => {
    controller.abort();
  }, 1_000);

  const {data, errors} = await fetchGraphQL(query, {
    variables: {name: 'Winston'},
    signal: controller.signal,
  });

  window.clearTimeout(timeout);
} catch (error) {
  // handle abort
}
```

Some GraphQL servers support streaming results for the [`@defer` and `@stream` directives](https://graphql.org/blog/2020-12-08-improving-latency-with-defer-and-stream-directives/). When an operation contains these directives, partial results are streamed to the client as they are available, and must be combined together to form a final result. To create a function that lets you fetch data from an HTTP endpoint like this, use the `createGraphQLStreamingHttpFetch()` function:

```tsx
import {createGraphQLStreamingHttpFetch} from '@quilted/graphql';

const fetchGraphQL = createGraphQLStreamingHttpFetch({url: '/graphql'});
```

This function accepts the same options as `createGraphQLHttpFetch()`. Instead of returning just a promise for the final result, this function returns an object that is both a promise (resolves when the final result has been received and combined) and an [async iterable](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols#the_async_iterator_and_async_iterable_protocols) (yields partial results as they are received):

```tsx
import {graphql} from '@quilted/graphql';

// `graphql` is optional, it just provides nice syntax highlighting
// in some editors.
const query = graphql`
  query MyQuery {
    # ...
  }
`;

for await (const {data, errors, incremental} of fetchGraphQL(query)) {
  // ...
}
```

### Building type-safe GraphQL resolvers

[GraphQL resolvers](https://graphql.org/learn/execution/#root-fields-resolvers) are functions that return the data for a particular type in a GraphQL schema. Writing these resolvers with the benefits of type-safe can be tricky, so this library provides a set of “resolver builders” to make this process easier.

To start, you need a type that describes your GraphQL schema. Quilt expects a schema to be represented as a single layer of nested objects, matching the types as named in your GraphQL schema. Fields on these types are expected to be functions that take the variable type for that field, and return the data for that field. For example, given the following GraphQL schema:

```graphql
type Query {
  me: Person!
}

type Mutation {
  greet(name: String!): String!
}

type Person {
  name: String!
}

schema {
  query: Query
  mutation: Mutation
}
```

Quilt expects a type like this:

```tsx
interface Schema {
  Query: {
    me(variables: Record<string, never>): Person;
  };
  Mutation: {
    greet(variables: {readonly name: string}): string;
  };
  Person: {
    name(variables: Record<string, never>): string;
  };
}
```

If you use [`@quilted/graphql-tools` to generate type definitions](../graphql-tools/README.md#typescript), you can have Quilt create this type for you automatically by importing from a `.graphql` file:

```tsx
import type {Schema} from './schema.graphql';
```

Once you have this type, you can use the `createGraphQLResolverBuilder()` helper provided by this library. This helper returns a collection of functions that are used to create GraphQL resolver objects matching the schema. In the example above, the resolvers for the schema could be written like this:

```tsx
import {createGraphQLResolverBuilder} from '@quilted/graphql/server';

import type {Schema} from './schema.graphql';

const {createQueryResolver, createMutationResolver} =
  createGraphQLResolverBuilder<Schema>();

const Query = createQueryResolver({
  me() {
    return {name: 'Winston'};
  },
});

const Mutation = createMutationResolver({
  greet(_, {name}) {
    return `Hello, ${name}!`;
  },
});
```

Commonly, you will want to have all fields in your schema that return a particular type to return some base object. That base object is then used by the resolver for that type to construct the final return value. You can indicate these type mappings by providing a second type argument to `createGraphQLResolverBuilder()`. For example, if we wanted all fields returning a `Person` to return an object that the `Person` resolver will use to construct its GraphQL fields, we could write the following:

```tsx
import {createGraphQLResolverBuilder} from '@quilted/graphql/server';

import type {Schema} from './schema.graphql';

interface GraphQLResolverValues {
  Person: {firstName: string; lastName?: string};
}

const {createResolver, createQueryResolver} = createGraphQLResolverBuilder<
  Schema,
  GraphQLResolverValues
>();

const Query = createQueryResolver({
  me() {
    return {firstName: 'Winston'};
  },
});

const Person = createResolver('Person', {
  name({firstName, lastName}) {
    return lastName ? `${firstName} ${lastName}` : firstName;
  },
});
```

GraphQL servers also commonly provide “context”, values shared throughout all resolvers in the schema. You can indicate the type of the context argument by providing a third type argument to `createGraphQLResolverBuilder()`. For example, if we will provide a `database` value through context, we could expose it to our resolvers like this:

```tsx
import {createGraphQLResolverBuilder} from '@quilted/graphql/server';

import type {Schema} from './schema.graphql';

interface GraphQLContext {
  database: Database;
}

const {createQueryResolver} = createGraphQLResolverBuilder<
  Schema,
  {},
  GraphQLContext
>();

const Query = createQueryResolver({
  // First argument is the "base" object, which is usually ignored for query fields
  // Second argument are the variables, which we don’t have for this field
  async me(_, __, {database}) {
    const me = await database.user.findFirst();
    return me;
  },
});
```

To actually run a GraphQL query, you need to include the resolvers created with these helpers in a GraphQL server. Most GraphQL servers, including [the reference JavaScript implementation](https://graphql.org/graphql-js/) and [GraphQL Yoga](https://the-guild.dev/graphql/yoga-server), provide a way to create a GraphQL server with these resolvers. For example, here’s how you would create a GraphQL server from these resolvers using [`@graphql-tools/schema`](https://the-guild.dev/graphql/tools/docs/generate-schema):

```tsx
import {graphql} from 'graphql';
import {makeExecutableSchema} from '@graphql-tools/schema';
import {createGraphQLResolverBuilder} from '@quilted/graphql/server';

// Assumes we are using `@quilted/graphql-tools`, which gives us both
// the schema source and type definitions as exports from the schema file
import schemaSource, {type Schema} from './schema.graphql';

const {createQueryResolver, createMutationResolver} =
  createGraphQLResolverBuilder<Schema>();

const Query = createQueryResolver({
  me() {
    return {name: 'Winston'};
  },
});

const Mutation = createMutationResolver({
  greet(_, {name}) {
    return `Hello, ${name}!`;
  },
});

const schema = makeExecutableSchema({
  typeDefs: schemaSource,
  resolvers: {Query, Mutation},
});

const result = await graphql(schema, 'query { me { name } }');
```

### Testing GraphQL-dependent code
