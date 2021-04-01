import {useResponseStatus} from '../hooks';

export function NotFound() {
  useResponseStatus(404);
  return null;
}
