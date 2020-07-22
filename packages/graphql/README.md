# `@quilted/graphql`

This package is basically an simplified amalgamation of a few of Shopify’s GraphQL libraries:

- The TypeScript type generation of [`graphql-typescript-definitions`](https://github.com/Shopify/graphql-tools-web/tree/main/packages/graphql-typescript-definitions) (through the `quilt-graphql-typescript` binary)
- The GraphQL operation “filler” from [`graphql-fixtures`](https://github.com/Shopify/graphql-tools-web/tree/main/packages/graphql-fixtures)
- The non-Apollo parts of [`graphql-testing`](https://github.com/Shopify/quilt/tree/master/packages/graphql-testing)

However, these simplifications mean that this package has the following differences from the ones listed above:

- Its type generation relies on the latest `graphql-config` configuration file format
- It only supports generating types for a `SimpleDocument`, not a `DocumentNode`, and therefore does not work with Apollo
- It generates a significantly different structure for nested types in a GraphQL operation that should make those types much easier to access and reason about
- The GraphQL controller, which is used to simulate GraphQL resolution in tests, automatically resolves GraphQL operations by default. This is unlike the `createGraphQLFactory` function from `graphql-testing`, where operations needed to be manually resolved with `graphql.resolveAll()`. The mock GraphQL controller also does not support wrapping every GraphQL resolution; this is generally not needed when the GraphQL resolution can happen without additional user intervention, as existing `act()` calls will typically already be wrapping the operations.
