import {useRouteNavigationEntry} from './route-navigation-entry.ts';

export function useRouteData<Data = unknown, Input = unknown>() {
  const entry = useRouteNavigationEntry<Data, Input>();

  if (entry.load == null) {
    return undefined as any as Data;
  }

  if (!entry.load.hasResolved) {
    throw entry.load.promise;
  }

  return entry.data;
}
