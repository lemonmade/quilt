export interface GraphQLOperationType<Data = unknown, Variables = {}> {
  // We need something to actually use the types, otherwise TypeScript
  // "discards" them for inference on extending interfaces.
  readonly __typeData?: Data;
  readonly __typeVariables?: Variables;
}

export interface GraphQLOperation<Data = unknown, Variables = {}>
  extends GraphQLOperationType<Data, Variables> {
  id: string;
  name?: string;
  source: string;
}

export type GraphQLData<T> = T extends GraphQLOperationType<infer Data, any>
  ? Data
  : never;

export type GraphQLVariables<T> = T extends GraphQLOperationType<
  any,
  infer Variables
>
  ? Variables
  : never;

export type GraphQLDeepPartialData<T> = DeepPartial<T>;

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object
    ? IsUnion<T[K], DeepPartialUnion<T[K]>, DeepPartial<T[K]>>
    : T[K];
};

type IsUnion<T, If, Else> = Exclude<Typenames<T>, ''> extends Typenames<T>
  ? If
  : Else;

type DeepPartialUnion<T> = T extends {__typename: string}
  ? T extends {__typename: ''}
    ? never
    : {__typename: T['__typename']} & DeepPartial<Omit<T, '__typename'>>
  : never;

type Typenames<T> = T extends {__typename: string} ? T['__typename'] : never;
