import {useContext} from 'react';
import {ConsumedPathContext} from '../context.ts';

export function useConsumedPath() {
  return useContext(ConsumedPathContext) ?? undefined;
}
