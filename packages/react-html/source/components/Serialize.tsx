import {useSerialized} from '../hooks/serialized.ts';

export function Serialize<T>({id, value}: {id: string; value: T}) {
  useSerialized(id, value);
  return null;
}
