import {AsyncComponentType, IfAllOptionalKeys, NoInfer} from '../types';

export type KeepFreshable<KeepFreshOptions extends object> = Pick<
  AsyncComponentType<any, any, any, any, KeepFreshOptions>,
  'useKeepFresh'
>;

export function useKeepFresh<KeepFreshOptions extends object>(
  ...args: IfAllOptionalKeys<
    KeepFreshOptions,
    [KeepFreshable<KeepFreshOptions>, NoInfer<KeepFreshOptions>?],
    [KeepFreshable<KeepFreshOptions>, NoInfer<KeepFreshOptions>]
  >
): ReturnType<typeof args[0]['useKeepFresh']> {
  const [keepFreshable, options = {}] = args;
  return (keepFreshable.useKeepFresh as any)(options);
}
