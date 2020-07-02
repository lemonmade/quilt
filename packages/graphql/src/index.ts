export interface GraphQLOperation<Data = unknown, Variables = {}> {
  // We need something to actually use the types, otherwise TypeScript
  // "discards" them for inference on extending interfaces.
  readonly __typeData?: Data;
  readonly __typeVariables?: Variables;
}

export interface GraphQLDocument<Data = unknown, Variables = {}>
  extends GraphQLOperation<Data, Variables> {
  id: string;
  name?: string;
  source: string;
}

export type GraphQLData<T> = T extends GraphQLOperation<infer Data, any>
  ? Data
  : never;

export type GraphQLVariables<T> = T extends GraphQLOperation<
  any,
  infer Variables
>
  ? Variables
  : never;
