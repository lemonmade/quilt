import {useResponseHeader} from '../hooks/response-header.ts';

interface Props {
  /**
   * The name of the header to append to.
   */
  name: string;

  /**
   * The value to append to this header.
   */
  value: string;
}

/**
 * Appends a response header to the provided value. Only works during
 * server-side rendering.
 */
export function ResponseHeader({name, value}: Props) {
  useResponseHeader(name, value);
  return null;
}
