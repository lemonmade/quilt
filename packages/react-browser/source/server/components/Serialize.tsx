export function Serialize<T>({id, value}: {id: string; value: T | (() => T)}) {
  return (
    <meta
      name={`serialized-${id}`}
      content={JSON.stringify(
        typeof value === 'function' ? (value as any)() : value,
      )}
    />
  );
}
