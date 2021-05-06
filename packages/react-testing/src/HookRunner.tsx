import {forwardRef, useRef, useImperativeHandle} from 'react';
import type {Ref, ReactElement} from 'react';

interface Props<HookResult = unknown> {
  useHook(): HookResult;
}

export interface ImperativeApi<HookResult = unknown> {
  readonly current: HookResult;
}

export const HookRunner = forwardRef<ImperativeApi, Props>(
  ({useHook}: Props, ref) => {
    const hookResult = useHook();
    const valueRef = useRef(hookResult);
    valueRef.current = hookResult;

    useImperativeHandle(ref, () => ({
      get current() {
        return valueRef.current;
      },
    }));

    return null;
  },
) as <HookResult>(
  props: Props<HookResult> & {ref?: Ref<ImperativeApi<HookResult>>},
) => ReactElement | null;
