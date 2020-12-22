import {useHttpAction} from './http-action';

export function useResponseHeader(header: string, value: string) {
  useHttpAction((http) => http.setHeader(header, value));
}
