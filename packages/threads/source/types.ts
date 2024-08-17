import type {SERIALIZE_METHOD} from './constants.ts';

/**
 * An object that provides a custom function to serialize its value.
 */
export interface ThreadSerializable {
  [SERIALIZE_METHOD](api: {serialize(value: any): unknown}): any;
}

export type AnyFunction = Function;
