import {
  DocumentNode,
  GraphQLOperation,
  GraphQLData,
  GraphQLVariables,
  IfUnionSize,
} from '@quilted/graphql';
import {AsyncHookTarget, Resolver} from '@quilted/react-async';

export {GraphQLData, GraphQLVariables};

type NonNullableKeys<T> = {
  [K in keyof T]-?: null extends T[K] ? never : K;
}[keyof T];

export type NoInfer<T> = {[K in keyof T]: T[K]} & T;

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
  skip?: boolean;
} & VariableOptions<Variables>;

export interface AsyncDocumentNode<Data, Variables> {
  readonly resolver: Resolver<DocumentNode<Data, Variables>>;
}

export type GraphQLDocument<Data, Variables> =
  | DocumentNode<DataCue, Variables>
  | AsyncDocumentNode<Data, Variables>;

export interface AsyncQuery<Data, Variables>
  extends AsyncDocumentNode<Data, Variables>,
    GraphQLOperation<Data, Variables>,
    AsyncHookTarget<
      {},
      VariableOptions<Variables>,
      VariableOptions<Variables>
    > {}
