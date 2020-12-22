import type {StatusCode} from '@quilted/http';
import {useHttpAction} from './http-action';

export function useResponseRedirect(to: string, statusCode?: StatusCode) {
  useHttpAction((http) => http.redirectTo(to, statusCode));
}
