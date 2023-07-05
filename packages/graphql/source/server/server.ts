import type {
  GraphQLResolver,
  GraphQLQueryResolver,
  GraphQLMutationResolver,
} from './types.ts';

export function createGraphQLResolverBuilder<
  Schema = {},
  Values = {},
  Context = {},
>() {
  type QueryResolver = GraphQLQueryResolver<Schema, Values, Context>;
  type MutationResolver = GraphQLMutationResolver<Schema, Values, Context>;

  return {
    /**
     * Creates a part of the GraphQL resolver for a specific type in the schema.
     *
     * @example
     * // assuming a schema with:
     * // type Person { name: String! }
     *
     * const {createResolver} = createGraphQLResolverBuilder<Schema>();
     *
     * const Person = createResolver('Person', {
     *   async name() {
     *     return 'Chris';
     *   },
     * });
     */
    createResolver,

    /**
     * Creates a part of the GraphQL resolver for the schema’s query type.
     *
     * @example
     * // assuming a schema with:
     * // type Query { me: Person! }
     * // type Person { name: String! }
     *
     * const {createQueryResolver} = createGraphQLResolverBuilder<Schema>();
     *
     * const Query = createQueryResolver({
     *   me() {
     *     return {name: 'Chris'};
     *   },
     * });
     */
    createQueryResolver<Fields extends keyof QueryResolver>(
      resolver: Required<Pick<QueryResolver, Fields>>,
    ) {
      return createResolver(
        'Query' as keyof Schema,
        resolver as any,
      ) as Required<Pick<QueryResolver, Fields>>;
    },
    /**
     * Creates a part of the GraphQL resolver for the schema’s mutation type.
     *
     * @example
     * // assuming a schema with:
     * // type Mutation { greet(name: String!): String! }
     *
     * const {createMutationResolver} = createGraphQLResolverBuilder<Schema>();
     *
     * const Mutation = createMutationResolver({
     *   greet(_, {name}) {
     *     return `Hello, ${name}!`;
     *   },
     * });
     */
    createMutationResolver<Fields extends keyof MutationResolver>(
      resolver: Required<Pick<MutationResolver, Fields>>,
    ) {
      return createResolver(
        'Mutation' as keyof Schema,
        resolver as any,
      ) as Required<Pick<MutationResolver, Fields>>;
    },
  };

  function createResolver<
    Type extends keyof Schema,
    Fields extends keyof GraphQLResolver<Schema[Type], Values, Context>,
  >(
    _type: Type,
    resolver: Required<
      Pick<GraphQLResolver<Schema[Type], Values, Context>, Fields>
    >,
  ) {
    return resolver;
  }
}

const foo = createGraphQLResolverBuilder();

foo.createResolver;
