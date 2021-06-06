export type IfUnionSize<
  Union,
  Size extends number,
  If = true,
  Else = false,
> = TupleFromUnion<Union> extends {length: Size} ? If : Else;

export type NoInfer<T> = {[K in keyof T]: T[K]} & T;

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

type TupleFromUnion<Union> = TupleFromUnionRec<Union, []>['result'];
