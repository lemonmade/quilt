import {ConsumedPathContext} from '../context.ts';

export function useConsumedPath() {
  return ConsumedPathContext.use({optional: true});
}
