import {useContext} from 'react';
import {InitialUrlContext} from '../context';

export function useInitialUrl() {
  return useContext(InitialUrlContext);
}
