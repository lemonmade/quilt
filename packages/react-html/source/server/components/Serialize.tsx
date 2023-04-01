interface Props<Data> {
  id: string;
  data: Data;
}

export function Serialize<Data>({id, data}: Props<Data>) {
  return <meta name={`serialized-${id}`} content={JSON.stringify(data)} />;
}
