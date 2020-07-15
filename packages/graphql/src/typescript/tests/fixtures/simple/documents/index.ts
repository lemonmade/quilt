import type {IfUnionSize} from '@quilted/useful-types';
import type {MyQueryData} from './MyQuery.graphql';

const name: MyQueryData.Me['name'] = 'Chris';
const me: MyQueryData.Me = {__typename: "Person", name, occupation: null};
const data: MyQueryData = {me};

type DeepPartialData<T> = {
  [K in keyof T]?: Typenames<T[K]> extends Exclude<Typenames<T[K]>, ''> ? DeepPartialUnionValue<Exclude<T[K], null>> : DeepPartialValue<Exclude<T[K], null>>;
}

type DeepPartial<T> = Typenames<T> extends Exclude<Typenames<T>, ''> ? DeepPartialUnionValue<Exclude<T, null>> : DeepPartialValue<Exclude<T, null>>;

type DeepPartialValue<T> = T extends {__typename: ''} ? DeepPartialUnionValue<T> : T extends object ? {
  [K in keyof T]?: T[K];
} : T;

type DeepPartialUnionValue<T> = T extends {__typename: string} ? {__typename: T['__typename']} & {
  [K in Exclude<keyof T, '__typename'>]?: T[K];
} : never;

type All<T> = {
  [K in keyof T]: T extends {__typename: string} ? T['__typename'] : never;
}

type Typenames<T> = T extends {__typename: string} ? T['__typename'] : never;
type IsUnion<T> = Typenames<T> extends Exclude<Typenames<T>, ''> ? false : true;

type Found = All<MyQueryData['family']>;

type Partial = DeepPartialData<MyQueryData>;
