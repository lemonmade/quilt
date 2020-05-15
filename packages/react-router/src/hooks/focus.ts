import {useContext} from 'react';

import {FocusContext} from '../context';

function useFocusContext() {
  const context = useContext(FocusContext);

  if (context == null) {
    throw new Error(
      'You attempted to use the focus context, but none was found. Make sure your code is nested in a <Router />',
    );
  }

  return context;
}

export function useRouteChangeFocusRef() {
  return useFocusContext();
}
