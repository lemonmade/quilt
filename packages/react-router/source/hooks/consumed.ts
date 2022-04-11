import {useContext} from 'react';
import {ConsumedPathContext} from '../context';

export function useConsumedPath() {
  return useContext(ConsumedPathContext) ?? undefined;
}
