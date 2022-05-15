# `@quilted/graphql`

This library provides a collection of utilities for performance-minded usage of GraphQL in JavaScript applications. It includes a [minimal GraphQL client](#client), a command line tool to [generate TypeScript definitions from GraphQL files](#typescript), and utilities to [generate type-safe GraphQL fixtures](#fixtures).

## Installation

```bash
$ yarn add @quilted/graphql
```

## Usage

### Client

TODO

### TypeScript

TODO

### Fixtures

This library provides a collection of utilities for providing type-safe fixture data in response to GraphQL operations. This is most useful in tests, where you will often want to completely simulate the GraphQL results in the application, but can also be useful as a dev-time technique when you have parts of your GraphQL schema that have not been implemented in your API.

These values are exported from the `@quilted/graphql/fixtures` entrypoint of this package.

#### `createGraphQLController()`

A `GraphQLController` is an object that accepts a set of mocks, and can then be asked to return the correct value at a later time with the `GraphQLController#run()` method.

A “mock” is an object that contains an `operation` key, detailing the GraphQL operation this mock should be used for, and a `result`, which is either a data object, or a function that receives the variables for a single invocation of the operation and returns a data object.

```ts
import {createGraphQLController} from '@quilted/graphql/fixtures';

// Here, we’re assuming you’ll use the plugin in @quilted/graphql/rollup to import the GraphQL
// document, but you can also provide the operation as a string, or as a GraphQL
// DocumentNode.
import myQuery from './MyQuery.graphql';

const controller = createGraphQLController({
  operation: myQuery,
  data: ({variables}) => ({mockQueryData: {count: variables.first}}),
});
```

> Note: these mock objects can be produced with the `createFiller` utility documented below, which allows you to construct fixtures that will always match the shape of the GraphQL operation.

To retrieve a fixture result, call `GraphQLController#run()` with the operation and, if necessary, variables for that invocation:

```ts
const controller = createGraphQLController({
  operation: myQuery,
  data: ({variables}) => ({mockQueryData: {count: variables.first}}),
});

// Returns a promise with {mockQueryData: {count: 10}}
const result = await controller.run(operation, {
  variables: {first: 10},
});
```

`GraphQLController#run()` is aliased as `GraphQLController#fetch()`.

The GraphQL controller has a few other features that can be useful when mocking out a GraphQL API. The first is the ability to control the delay before returning a GraphQL result with `GraphQLController#timing()`. This allows you to simulate slower network conditions, or to prevent GraphQL results from being returned automatically when `run()` is called. This method accepts the operation and a `delay` option to control how long a GraphQL result should be delayed (in milliseconds).

```ts
const controller = createGraphQLController({
  operation: myQuery,
  data: ({variables}) => ({mockQueryData: {count: variables.first}}),
});

controller.timing(myQuery, {delay: 100});

// Same as before, but now takes 100ms longer!
const result = await controller.run(myQuery, {
  variables: {first: 10},
});
```

You can delay a result from being returned indefinitely by setting `delay` to `true` instead of a number. This can be useful when you want to have very specific control over when GraphQL operations are resolved, but requires that you manually resolve pending GraphQL operations with another method provided by the controller: `GraphQLController#resolveAll()`. This method will resolve all pending GraphQL operations, regardless of their `timing` delay. It also returns a promise that resolves after all of those GraphQL operations have finished.

```ts
const controller = createGraphQLController({
  operation: myQuery,
  data: ({variables}) => ({mockQueryData: {count: variables.first}}),
});

controller.timing(myQuery, {delay: true});

const resultPromise = controller.run(myQuery, {
  variables: {first: 10},
});

await controller.resolveAll();
const result = await resultPromise;
```

This `resolveAll()` method accepts an option argument that can restrict this resolution to only a single operation, using the `operation` option. You can also pass `untilEmpty: false` to this option, which disables the default behavior of continuing to resolve all pending GraphQL operations in a loop until none remain.

```ts
const controller = createGraphQLController({
  operation: myQuery,
  data: ({variables}) => ({mockQueryData: {count: variables.first}}),
});

controller.timing(myQuery, {delay: true});

const resultPromise = controller.run(myQuery, {
  variables: {first: 10},
});

// Like the previous example, but this will not resolve any other operations
// that are pending, and will only resolve a pending `myQuery` operation that
// was pending when resolveAll() was called.
await controller.resolveAll({
  operation: myQuery,
  untilEmpty: false,
});

const result = await resultPromise;
```

#### `createFiller()`

The `GraphQLController` object is useful, but providing mock objects can be tedious, especially for larger queries and mutations. The `createFiller` utility can construct conforming mock objects that are guaranteed to match the types of your GraphQL query or mutation, preventing them from ever going out of data, and helping you avoid declaring unimportant fields just to satisfy the full shape of the GraphQL operation.

In order to do this job, `createFiller` needs to know your GraphQL schema. This allows the utility to provide the correct types for each field it finds in your GraphQL operation. You can provide the GraphQL schema any way you like, but this library also provides a `createSchema` function that accepts an array of string [GraphQL SDL definitions](https://graphql.org/learn/schema/) and merges them into a schema with [`@graphql-tools/merge`](https://www.graphql-tools.com/docs/api/modules/merge):

```ts
import {createFiller, createSchema} from '@quilted/graphql/fixtures';

const schema = createSchema(`
  type Query { name: String! }
  schema { query: Query }
`);

const fillGraphQL = createFiller(schema);
```

The result of calling `createFiller` is itself a function. This function accepts a GraphQL operation (either as a string, a `DocumentNode`, or the shape produced by `@quilted/graphql`) and returns an object that can be passed directly to `createGraphQLController()`:

```ts
import {
  createFiller,
  createSchema,
  createGraphQLController,
} from '@quilted/graphql/fixtures';

const schema = createSchema(`
  type Query { name: String! }
  schema { query: Query }
`);

const fillGraphQL = createFiller(schema);

const controller = createGraphQLController(fillGraphQL(`query Name { name }`));
```

If you provide just the GraphQL operation to `fillGraphQL`, as we’ve done above, the mock function will produce results that are the correct shape, with all the right types, but set to entirely random value. In the case above, that means that `fillGraphQL` will return, for each invocation, an object with a `name` key set to a random `string` (since the root `name` field is a `String!` GraphQL type). However, you can also pass a second argument. This argument can either be an object, or a function that receives `variables` for a particular invocation, and returns an object. This object can be any partial subset of the expected query shape; any fields you do not provide will be filled in with suitable random values. This allows you to focus your fixtures on only the data you actually care about, and allow the computer to fill in the rest.

```ts
import nameQuery from './NameQuery.graphql';

const fillGraphQL = createFiller(schema);

const controller = createGraphQLController(
  fillGraphQL(nameQuery, {name: 'Breonna'}),
);
```

This “partial filling” is the key feature of this utility. If you use the [TypeScript type generation](#typescript) provided by this library, the partial fills you provide will be type-checked to ensure you only provide partials that make sense for your GraphQL operation. If you provide a function,

##### `resolvers`

`createFiller` accepts an additional options object. The only option currently supported is `resolvers`, which allows you to provide an object that controls the default values provided for fields when no explicit value is provided. This allows you to provide sensible random values for types like custom scalars so that they represent realistic values. These resolvers are called with GraphQL `type` object for that type, the `parent` type (for the object type on which this field is being filled), the `field` name being filled, and a `random` object, which is a [`Chance.js` object](https://chancejs.com) that is shared across all resolvers to ensure consistent mocks are returned for multiple invocations of the same operation.

```ts
const fillGraphQL = createFiller(schema, {
  // This overrides the default `ID` mock to provide ids in a consistent shape,
  // here using Shopify’s gid pattern.
  ID: ({random, parent}) => `gid://shopify/${parent.name}/${random.integer()}`,
  // Here, we’re providing a custom resolver for a custom scalar in our schema,
  // `DateTime`. This ensures that mock values provided for this type will be
  // valid dates, as the default would simply provide random strings.
  DateTime: ({random}) => random.date().toISOString(),
});
```

#### Matchers

This library also provides a [Jest matcher](https://jestjs.io/docs/en/using-matchers) to assert on the operations performed against a `GraphQLController`. To use this matcher, you’ll need to include `@quilted/graphql/matchers` in your Jest setup file. The following matcher will then be available:

#### `toHavePerformedGraphQLOperation(operation: GraphQLOperation, variables?: object)`

This assertion verifies that at least one operation matching the one you passed was completed. If you pass variables, this assertion will also ensure that at least one operation had matching variables. You only need to provide a subset of all variables, and the assertion argument can use any of Jest’s asymmetric matchers.

```tsx
import '@quilted/graphql/matchers';
import {createGraphQLController} from '@quilted/graphql/fixtures';

import myQuery from './MyQuery.graphql';

const graphql = createGraphQLController(...mocks);

// perform some operations...

expect(graphql).toHavePerformedGraphQLOperation(myQuery);
expect(graphql).toHavePerformedGraphQLOperation(myQuery, {
  id: '123',
  first: expect.any(Number),
});
```

### History

This package is basically an simplified amalgamation of a few of Shopify’s GraphQL libraries:

- The TypeScript type generation of [`graphql-typescript-definitions`](https://github.com/Shopify/graphql-tools-web/tree/main/packages/graphql-typescript-definitions) (through the `quilt-graphql-typescript` binary)
- The GraphQL operation “filler” from [`graphql-fixtures`](https://github.com/Shopify/graphql-tools-web/tree/main/packages/graphql-fixtures)
- The non-Apollo parts of [`graphql-testing`](https://github.com/Shopify/quilt/tree/master/packages/graphql-testing)

However, these simplifications mean that this package has the following differences from the ones listed above:

- Its type generation relies on the latest `graphql-config` configuration file format
- It only supports generating types for a `SimpleDocument`, not a `DocumentNode`, and therefore does not work with Apollo
- It generates a significantly different structure for nested types in a GraphQL operation that should make those types much easier to access and reason about
- The GraphQL controller, which is used to simulate GraphQL resolution in tests, automatically resolves GraphQL operations by default. This is unlike the `createGraphQLFactory` function from `graphql-testing`, where operations needed to be manually resolved with `graphql.resolveAll()`. The mock GraphQL controller also does not support wrapping every GraphQL resolution; this is generally not needed when the GraphQL resolution can happen without additional user intervention, as existing `act()` calls will typically already be wrapping the operations.
