import {useResponseSerialization} from '../hooks/serialized.ts';

export function Serialize<T = unknown>({
  id,
  value,
}: {
  id: string;
  value: T | (() => T);
}) {
  if (typeof document === 'object') return null;
  useResponseSerialization(id, value);
  return null;
}
