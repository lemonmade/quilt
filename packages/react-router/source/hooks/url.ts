import {useContext} from 'react';
import {CurrentUrlContext} from '../context';

export function useCurrentUrl() {
  const url = useContext(CurrentUrlContext);

  if (url == null) {
    throw new Error(
      'You attempted to use the current URL, but none was found. Make sure your code is nested in a <Routing /> component',
    );
  }

  return url;
}
