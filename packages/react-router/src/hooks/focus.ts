import {useContext} from 'react';
import type {MutableRefObject} from 'react';

import type {Focusable} from '../types';
import {FocusRefContext} from '../context';

export function useRouteChangeFocus<
  T extends Focusable,
>(): MutableRefObject<T> {
  const context = useContext(FocusRefContext);

  if (context == null) {
    throw new Error(
      'You attempted to use the focus context, but none was found. Make sure your code is nested in a <Router />',
    );
  }

  return context as MutableRefObject<T>;
}
