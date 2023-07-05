import type {GraphQLResolveInfo} from 'graphql';

/**
 * An object that resolves the fields of a GraphQL object type.
 */
export type GraphQLResolver<Type, Values, Context> = {
  [Field in keyof Type]?: Type[Field] extends (
    variables: infer Variables,
  ) => infer ReturnValue
    ? GraphQLResolverField<Type, Variables, ReturnValue, Values, Context>
    : never;
};

/**
 * A helper type that returns the GraphQL object resolver for the query
 * type in the schema. If this schema does not have a query type, an
 * empty GraphQL resolver type is resolves instead.
 */
export type GraphQLQueryResolver<
  Schema = {},
  Values = {},
  Context = {},
> = GraphQLResolver<
  Schema extends {
    Query?: any;
  }
    ? Schema['Query']
    : {},
  Values,
  Context
>;

/**
 * A helper type that returns the GraphQL object resolver for the mutation
 * type in the schema. If this schema does not have a mutation type, an
 * empty GraphQL resolver type is resolves instead.
 */
export type GraphQLMutationResolver<
  Schema = {},
  Values = {},
  Context = {},
> = GraphQLResolver<
  Schema extends {
    Mutation?: any;
  }
    ? Schema['Mutation']
    : {},
  Values,
  Context
>;

/**
 * The type for a single field on a GraphQL object resolver. Each field is a function
 * that accepts:
 *
 * @param value - the value returned for this field by the parent resolver.
 * @param variables - an object of variables passed to the field in the GraphQL query or mutation.
 * @param context - an object passed in to GraphQL resolvers by the GraphQL server.
 * @param info - an object containing metadata about the GraphQL field, query, and server.
 */
export type GraphQLResolverField<Type, Variables, ReturnType, Values, Context> =
  (
    value: GraphQLReturnResult<Type, Values, Context>,
    variables: Variables,
    context: Context,
    info: GraphQLResolveInfo,
  ) =>
    | GraphQLReturnResult<ReturnType, Values, Context>
    | Promise<GraphQLReturnResult<ReturnType, Values, Context>>;

/**
 * The type that a GraphQL resolver should return, in order to conform to the
 * `Type` generic type argument. For simple types, like strings, numbers, and
 * booleans, the return type is the same as the `Type` argument. For more complex
 * object types, the expected type will first be looked up from the `Values`
 * generic type argument, and if such a type does not exist, will then resolve
 * to a JavaScript object that has all the data implied by `Type`.
 */
export type GraphQLReturnResult<Type, Values, Context> = Type extends null
  ? null
  : Type extends number
  ? number
  : Type extends string
  ? string
  : Type extends boolean
  ? boolean
  : Type extends (infer U)[]
  ? GraphQLReturnResult<U, Values, Context>[]
  : Type extends {__possibleTypes: any}
  ? GraphQLReturnResult<Type['__possibleTypes'], Values, Context>
  : Type extends {__typename: any}
  ? Type['__typename'] extends keyof Values
    ? Values[Type['__typename']]
    : GraphQLDefaultObjectReturnResult<Type, Values, Context>
  : never;

/**
 * Transforms a GraphQL type, expressed as an object with methods for each
 * field, into a JavaScript object with just the field types.
 */
export type GraphQLDefaultObjectReturnResult<Type, Values, Context> = {
  [Field in Exclude<keyof Type, '__typename'>]: Type[Field] extends (
    variables: any,
  ) => infer ReturnValue
    ? GraphQLReturnResult<ReturnValue, Values, Context>
    : never;
};
