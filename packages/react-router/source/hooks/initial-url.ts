import {useContext} from 'react';
import {InitialUrlContext} from '../context.ts';

export function useInitialUrl() {
  return useContext(InitialUrlContext);
}
