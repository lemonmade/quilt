import type {StatusCode} from '@quilted/http';
import {useResponseStatus} from '../hooks';

export interface Props {
  code: StatusCode;
}

export function ResponseStatus({code}: Props) {
  useResponseStatus(code);
  return null;
}
