import {forwardRef} from 'preact/compat';
import {useRef, useImperativeHandle} from 'preact/hooks';
import type {Ref, VNode} from 'preact';

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
) => VNode<any> | null;
