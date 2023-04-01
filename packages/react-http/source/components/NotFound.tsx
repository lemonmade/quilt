import {useResponseStatus} from '../hooks/response-status.ts';

/**
 * This component sets a 404 status code on the current response.
 */
export function NotFound() {
  useResponseStatus(404);
  return null;
}
