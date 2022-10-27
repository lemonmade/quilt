import type {
  RELEASE_METHOD,
  RETAIN_METHOD,
  ENCODE_METHOD,
  RETAINED_BY,
} from './constants';

export type Thread<Target> = ThreadCallable<Target>;

export interface ThreadTarget {
  send(message: any, transferables?: Transferable[]): void;
  listen(options: {signal?: AbortSignal}): AsyncGenerator<any, void, void>;
}

export interface ThreadExposableFunction<Args extends any[], ReturnType> {
  (...args: ThreadSafeArgument<Args>): ReturnType extends Promise<any>
    ? ReturnType
    : ReturnType extends AsyncGenerator<any, any, any>
    ? ReturnType
    : ReturnType | Promise<ReturnType>;
}

export type ThreadExposable<T> = {
  [K in keyof T]: T[K] extends (...args: infer Args) => infer ReturnType
    ? ThreadExposableFunction<Args, ReturnType>
    : never;
};

export interface ThreadCallableFunction<Args extends any[], ReturnType> {
  (...args: ThreadSafeArgument<Args>): ThreadSafeReturnType<ReturnType>;
}

export type ThreadCallable<T> = {
  [K in keyof T]: T[K] extends (...args: infer Args) => infer ReturnType
    ? ThreadCallableFunction<Args, ReturnType>
    : never;
};

export type MaybePromise<T> = T extends Promise<any> ? T : T | Promise<T>;

export type ThreadSafeReturnType<T> = T extends AsyncGenerator<any, any, any>
  ? T
  : T extends Generator<infer T, infer R, infer N>
  ? AsyncGenerator<T, R, N>
  : T extends Promise<any>
  ? T
  : T extends infer U | Promise<infer U>
  ? Promise<U>
  : T extends (...args: infer Args) => infer TypeReturned
  ? (...args: Args) => ThreadSafeReturnType<TypeReturned>
  : T extends (infer ArrayElement)[]
  ? ThreadSafeReturnType<ArrayElement>[]
  : T extends readonly (infer ArrayElement)[]
  ? readonly ThreadSafeReturnType<ArrayElement>[]
  : T extends object
  ? {[K in keyof T]: ThreadSafeReturnType<T[K]>}
  : T;

export type ThreadSafeArgument<T> = T extends (
  ...args: infer Args
) => infer TypeReturned
  ? TypeReturned extends Promise<any>
    ? (...args: Args) => TypeReturned
    : TypeReturned extends AsyncGenerator<any, any, any>
    ? (...args: Args) => TypeReturned
    : TypeReturned extends Generator<infer T, infer R, infer N>
    ? (...args: Args) => AsyncGenerator<T, R, N>
    : TypeReturned extends boolean
    ? (...args: Args) => boolean | Promise<boolean>
    : (...args: Args) => TypeReturned | Promise<TypeReturned>
  : {[K in keyof T]: ThreadSafeArgument<T[K]>};

export interface MemoryRetainer {
  add(manageable: MemoryManageable): void;
}

export interface MemoryManageable {
  readonly [RETAINED_BY]: Set<MemoryRetainer>;
  [RETAIN_METHOD](): void;
  [RELEASE_METHOD](): void;
}

export interface ThreadEncodingStrategy {
  encode(value: unknown): [any, Transferable[]?];
  decode(value: unknown, retainedBy?: Iterable<MemoryRetainer>): unknown;
  call(id: string, args: any[]): any;
  release(id: string): void;
  terminate?(): void;
}

export interface ThreadEncodingStrategyApi {
  uuid(): string;
  release(id: string): void;
  call(
    id: string,
    args: any[],
    retainedBy?: Iterable<MemoryRetainer>,
  ): Promise<any>;
}

export interface ThreadEncodable {
  [ENCODE_METHOD](api: {encode(value: any): unknown}): any;
}

// eslint-disable-next-line @typescript-eslint/ban-types
export type AnyFunction = Function;
