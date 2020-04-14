import type {DocumentNode as BaseDocumentNode} from 'graphql';

export interface GraphQLOperation<Data = {}, Variables = {}> {
  // We need something to actually use the types, otherwise TypeScript
  // "discards" them for inference on extending interfaces.
  readonly __typeData?: Data;
  readonly __typeVariables?: Variables;
}

export interface DocumentNode<Data = {}, Variables = {}>
  extends BaseDocumentNode,
    GraphQLOperation<Data, Variables> {}

export type GraphQLData<T> = T extends GraphQLOperation<infer Data, any>
  ? Data
  : never;

export type GraphQLVariables<T> = T extends GraphQLOperation<
  any,
  infer Variables
>
  ? Variables
  : never;

// Union length helpers, mostly from
// https://github.com/microsoft/TypeScript/issues/13298#issuecomment-544107351

type TuplePrepend<Tuple extends any[], NewElement> = ((
  h: NewElement,
  ...t: Tuple
) => any) extends (...args: infer ResultTuple) => any
  ? ResultTuple
  : never;

type Consumer<Value> = (value: Value) => void;

type IntersectionFromUnion<Union> = (
  Union extends any ? Consumer<Union> : never
) extends Consumer<infer ResultIntersection>
  ? ResultIntersection
  : never;

// Creates an intersection of Consumer types, where each accepts one
// of the union types
type OverloadedConsumerFromUnion<Union> = IntersectionFromUnion<
  Union extends any ? Consumer<Union> : never
>;

type UnionLast<Union> = OverloadedConsumerFromUnion<Union> extends (
  a: infer A,
) => void
  ? A
  : never;

type UnionExcludingLast<Union> = Exclude<Union, UnionLast<Union>>;

type TupleFromUnionRec<RemainingUnion, CurrentTuple extends any[]> = [
  RemainingUnion,
] extends [never]
  ? {result: CurrentTuple}
  : {
      result: TupleFromUnionRec<
        UnionExcludingLast<RemainingUnion>,
        TuplePrepend<CurrentTuple, UnionLast<RemainingUnion>>
      >['result'];
    };

export type TupleFromUnion<Union> = TupleFromUnionRec<Union, []>['result'];

export type IfUnionSize<
  Union,
  Size extends number,
  If = true,
  Else = false
> = TupleFromUnion<Union> extends {length: Size} ? If : Else;
