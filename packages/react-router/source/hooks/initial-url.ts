import {useContext} from 'react';
import {InitialUrlContext} from '../context';

export function useInitialUrl() {
  const url = useContext(InitialUrlContext);

  if (url == null) {
    throw new Error(
      'You attempted to use the initial URL, but none was found. This can happen when server rendering if you do not wrap your app in a <InitialUrlContext.Provider />',
    );
  }

  return url;
}
