import {useBrowserDetails} from '../context.ts';

export function useSerialized<T = unknown>(id: string): T {
  return useBrowserDetails().serializations.get<T>(id);
}
