import {
  GraphQLOperationType,
  GraphQLOperation,
  GraphQLData,
  GraphQLVariables,
} from '@quilted/graphql';
import {Prefetchable, Preloadable, Resolver} from '@quilted/react-async';
import {IfUnionSize} from '@quilted/useful-types';

export type {
  GraphQLOperation,
  GraphQLOperationType,
  GraphQLData,
  GraphQLVariables,
};

type NonNullableKeys<T> = {
  [K in keyof T]-?: null extends T[K] ? never : K;
}[keyof T];

export type IfAllVariablesOptional<Obj, If, Else = never> = IfUnionSize<
  NonNullableKeys<Obj>,
  0,
  If,
  Else
>;

export type IfEmptyObject<Obj, If, Else = never> = IfUnionSize<
  keyof Obj,
  0,
  If,
  Else
>;

export type VariableOptions<Variables> = IfEmptyObject<
  Variables,
  {variables?: never},
  IfAllVariablesOptional<
    Variables,
    {variables?: Variables},
    {variables: Variables}
  >
>;

export type QueryOptions<_Data, Variables> = {
  cache?: boolean;
} & VariableOptions<Variables>;

export type MutationOptions<_Data, Variables> = VariableOptions<Variables>;

export interface AsyncGraphQLOperation<Data, Variables> {
  readonly resolver: Resolver<GraphQLOperation<Data, Variables>>;
}

export type AnyGraphQLOperation<Data, Variables> =
  | GraphQLOperation<DataCue, Variables>
  | AsyncGraphQLOperation<Data, Variables>;

export interface AsyncQuery<Data, Variables>
  extends AsyncGraphQLOperation<Data, Variables>,
    GraphQLOperation<Data, Variables>,
    Preloadable<VariableOptions<Variables>>,
    Prefetchable<VariableOptions<Variables>> {}

export interface GraphQLRequest<Data, Variables> {
  operation: GraphQLOperation<Data, Variables>;
  variables: Variables;
}

export type GraphQLFetch = (
  request: GraphQLRequest<unknown, unknown>,
) => Promise<object>;

export type Result<Data> =
  | {
      data: Data;
      error?: undefined;
    }
  | {data?: undefined; error: Error};
