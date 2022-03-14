import {useSerialized} from '../hooks';
import type {Serializable} from '../types';

export function Serialize({id, value}: {id: string; value: Serializable}) {
  useSerialized(id, value);
  return null;
}
