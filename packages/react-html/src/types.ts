export type Serializable =
  | string
  | number
  | boolean
  | undefined
  | null
  | {[key: string]: Serializable}
  | Serializable[];
