import type {CookieOptions} from '@quilted/http';
import {useHttpAction} from '../hooks/http-action.ts';

export interface DeleteProps {
  /**
   * The name of the cookie to delete.
   */
  name: string;

  /**
   * Deletes the provided cookie instead of setting a new value.
   */
  delete: true;

  value?: never;

  /**
   * If the original cookie was set with a custom `path` you **must**
   * provide a matching `path` to delete the cookie.
   */
  path?: string;

  /**
   * If the original cookie was set with a custom `domain` you **must**
   * provide a matching `domain` to delete the cookie.
   */
  domain?: string;
}

export interface SetProps extends CookieOptions {
  /**
   * The name of the cookie to set.
   */
  name: string;

  delete?: never;

  /**
   * The value to set for this cookie.
   */
  value: string;
}

export type Props = SetProps | DeleteProps;

/**
 * Sets a cookie on the HTTP response (that is, using the `Set-Cookie`
 * header). This component accepts a `name` and `delete` prop, if you
 * want to remove the cookie, or a `name` and `value` prop, if you
 * want to set it to a new value. This component also has props for
 * all the available cookie options.
 *
 * This component only works during server-side rendering. If you want
 * to set cookies in JavaScript, use the `useCookies` function to
 * get access to the cookie manager, and use the `set()` method to
 * update the cookie.
 */
export function ResponseCookie({
  name,
  value,
  delete: shouldDelete,
  ...options
}: Props) {
  useHttpAction((http) => {
    if (shouldDelete) {
      http.cookies.delete(name, options);
    } else {
      http.cookies.set(name, value!, options);
    }
  });

  return null;
}
