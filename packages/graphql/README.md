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

If you want to take more control over the HTTP request, this library also provides a helpful subclass of the built-in [`Request` class](https://developer.mozilla.org/en-US/docs/Web/API/Request) that will automatically serialize GraphQL operations into the body of the request. You can use instances of this object with the global `fetch()` API, but remember that you will need to parse the response yourself.

```tsx
import {GraphQLFetchRequest} from '@quilted/graphql';

const request = new GraphQLFetchRequest(
  '/graphql',
  'query MyQuery($name: String!) { ... }',
  {
    variables: {name: 'Winston'},
  },
);

const response = await fetch(request);
const result = await response.json();
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

To actually run a GraphQL query, you need to include the resolvers created with these helpers in a GraphQL server. Most GraphQL servers, including [the reference JavaScript implementation](https://graphql.org/graphql-js/) and [GraphQL Yoga](https://the-guild.dev/graphql/yoga-server), need a GraphQL schema to execute a query or mutation. For convenience, this library provides a `createGraphQLSchema()` helper that can create a GraphQL schema object from your resolvers:

```tsx
import {graphql} from 'graphql';
import {
  createGraphQLSchema,
  createGraphQLResolverBuilder,
} from '@quilted/graphql/server';

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

const schema = createGraphQLSchema(schemaSource, {Query, Mutation});

const result = await graphql({
  schema,
  source: 'query { me { name } }',
});
```

### Testing GraphQL-dependent code

During testing, it can be useful to have a GraphQL fetcher that always returns specific results. Having this tool at your disposal lets you simulate a GraphQL-dependent UI in various states. This library helps you implement this pattern, while taking advantage of the type safety of GraphQL to ensure test results are always valid.

There are two main parts to these GraphQL testing utilities: a GraphQL “controller”, which can fetch mock GraphQL results, and GraphQL “fillers”, which can provide type-safe mocked results for individual GraphQL queries and mutations.

To create a controller, use the `createGraphQLController()` function. This function accepts one or more GraphQL “mocks”: objects that contain an `operation` key, detailing the GraphQL operation this mock should be used for, and a `result` key. The result can either be an object, or a function that returns an object, or a function that returns a promise for an object. This `result` will be used to fulfill a GraphQL operation matching the `operation` key.

To demonstrate, we’ll assume you have a GraphQL schema that looks like this:

```graphql
type Person {
  name: String!
  age: Int!
}

type Query {
  me: Person!
}

schema {
  query: Query
}
```

We could create a GraphQL controller with a hand-written mock:

```tsx
import {graphql, createGraphQLController} from '@quilted/graphql/testing';

// `graphql` is optional, but it can provide better syntax
// highlighting in some editors.
const query = graphql`
  query Me {
    me {
      name
      age
    }
  }
`;

const controller = createGraphQLController();

controller.mock({
  operation: query,
  result() {
    return {
      me: {name: 'Winston', age: 9},
    };
  },
});
```

And you can then use this controller to fetch results by using its `fetch()` method:

```tsx
const result = await controller.fetch(query);
// {data: {me: {name: 'Winston', age: 9}}}
```

We have a controller, but we haven’t done anything particularly useful yet — we had to know the exact shape of our GraphQL queries, and mock all the fields manually. This is where GraphQL “fillers” come in: they let you create mocks for GraphQL queries that will automatically fill in the correct shape of the query.

To create GraphQL fillers, we need a GraphQL schema to describe the available types. If you use [`@quilted/graphql-tools`](../graphql-tools/README.md#typescript), you can import this schema’s TypeScript type and schema source, which can be used to create a GraphQL schema (using the `createGraphQLSchema()` helper) and filler function (using the `createGraphQLFiller()` helper):

```tsx
import {
  createGraphQLSchema,
  createGraphQLFiller,
} from '@quilted/graphql/testing';

import schemaSource from './schema.graphql';

const schema = createGraphQLSchema(schemaSource);
const fillGraphQL = createGraphQLFiller(schema);
```

Now, when we create GraphQL controllers, we can use the `fillGraphQL` function to create fillers for our queries and mutations. If we provide just a GraphQL operation to this function, it will create a GraphQL mock that fills in data for the query, respecting the nullability of your GraphQL schema and the types of your fields:

```tsx
import {createGraphQLController} from '@quilted/graphql/testing';

const controller = createGraphQLController();

const query = `
  query Me {
    me {
      name
      age
    }
  }
`;

controller.mock(fillGraphQL(query));

const result = await controller.fetch(query);
// {data: {me: {name: 'random string', age: 123}}}
```

When writing tests, it’s common to want to set a specific subset of fields, but allow other fields outside of the area under the test to be random values. You can do this by providing a subset of the GraphQL operation as the second argument to `fillGraphQL()`:

```tsx
import {createGraphQLController} from '@quilted/graphql/testing';

const controller = createGraphQLController();

const query = `
  query Me {
    me {
      name
      age
    }
  }
`;

controller.mock(fillGraphQL(query, {me: {name: 'Winston'}}));

const result = await controller.fetch(query);
// {data: {me: {name: 'Winston', age: 123}}}
```

When you use [`@quilted/graphql-tools`](../graphql-tools/README.md#typescript) to import GraphQL queries and mutations, TypeScript will ensure you only provide matching fields in your mock data:

```tsx
import {createGraphQLController} from '@quilted/graphql/testing';

import meQuery from './MeQuery.graphql';

const controller = createGraphQLController();

controller.mock(fillGraphQL(meQuery, {me: {age: '123'}}));
// Type error: `me.age` must be a number
```

The automatically filled data will match the shape of your operation, but otherwise will be randomly generated using the [chance library](https://chancejs.com). If you have specific types that always return data in a particular shape (such as [custom scalars](https://graphql.org/learn/schema/)), you can provide default value creators for those types when calling `createGraphQLFiller()`:

```tsx
import {
  createGraphQLSchema,
  createGraphQLFiller,
} from '@quilted/graphql/testing';

import schemaSource from './schema.graphql';

const schema = createGraphQLSchema(schemaSource);
const fillGraphQL = createGraphQLFiller(schema, {
  resolvers: {
    // For convenience, the Chance object is provided for you to generate
    // random values matching your custom data shape
    Date: ({random}) => random.date().toISOString(),

    // This overrides the default `ID` mock to provide ids in a consistent shape,
    // here using a gid pattern.
    ID: ({random, parent}) => `gid://my-app/${parent.name}/${random.integer()}`,
  },
});
```
