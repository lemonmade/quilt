import {useResponseHeader} from '../hooks';

interface Props {
  name: string;
  value: string;
}

export function ResponseHeader({name, value}: Props) {
  useResponseHeader(name, value);
  return null;
}
