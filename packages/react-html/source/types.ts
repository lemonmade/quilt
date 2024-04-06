export type Serializable<T> = T extends readonly (infer U)[]
  ? readonly Serializable<U>[]
  : T extends {toJSON(): infer U}
    ? Serializable<U>
    : T extends (...args: any[]) => any
      ? never
      : T extends undefined
        ? never
        : T extends string | number | boolean | null
          ? T
          : OmitNever<{[K in keyof T]: Serializable<T[K]>}>;

type OmitNever<T> = Pick<
  T,
  {[K in keyof T]: T[K] extends never ? never : K}[keyof T]
>;
