import {useContext} from 'react';
import {HeadersContext} from '../context';
import {useHttpAction} from './http-action';

export function useRequestHeader(header: string) {
  const headers = useContext(HeadersContext);

  useHttpAction((http) => http.persistHeader(header));

  if (headers == null) {
    throw new Error('No HTTP header context found');
  }

  return headers.get(header);
}
