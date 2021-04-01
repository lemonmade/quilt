import {useResponseHeader} from '../hooks';

interface Props {
  header: string;
  value: string;
}

export function ResponseHeader({header, value}: Props) {
  useResponseHeader(header, value);
  return null;
}
