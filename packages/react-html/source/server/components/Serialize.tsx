export interface SerializeProps<Data> {
  id: string;
  data: Data;
}

export function Serialize<Data>({id, data}: SerializeProps<Data>) {
  return <meta name={`serialized-${id}`} content={JSON.stringify(data)} />;
}
