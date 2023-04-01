import {useContext, MutableRefObject} from 'react';

import {Focusable} from '../types.ts';
import {FocusContext} from '../context.ts';

export function useRouteChangeFocusRef<
  T extends Focusable,
>(): MutableRefObject<T> {
  const context = useContext(FocusContext);

  if (context == null) {
    throw new Error(
      'You attempted to use the focus context, but none was found. Make sure your code is nested in a <Routing /> component',
    );
  }

  return context as MutableRefObject<T>;
}
