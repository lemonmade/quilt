import type {StatusCode} from '@quilted/http';
import {useHttpAction} from './http-action';

export function useResponseStatus(statusCode: StatusCode) {
  useHttpAction((http) => http.addStatusCode(statusCode));
}
