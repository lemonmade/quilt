import {useSerialized} from '../hooks';

export function Serialize<T>({id, value}: {id: string; value: T}) {
  useSerialized(id, value);
  return null;
}
