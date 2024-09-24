import {useResponseSerialization} from '../hooks/serialized.ts';

export function Serialize<T = unknown>({
  name,
  content,
}: {
  name: string;
  content: T | (() => T);
}) {
  if (typeof document === 'object') return null;
  useResponseSerialization(name, content);
  return null;
}
