import type {StatusCode} from '@quilted/http';
import {useResponseStatus} from '../hooks';

export interface Props {
  /**
   * The response status code for this request.
   */
  code: StatusCode;
}

/**
 * Sets the HTTP response status code for this request. If this component
 * is rendered multiple times in your React application, the one with
 * the highest status code will be used.
 *
 * This component only works during server-side rendering.
 */
export function ResponseStatus({code}: Props) {
  useResponseStatus(code);
  return null;
}
