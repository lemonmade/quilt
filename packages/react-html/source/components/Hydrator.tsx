import {useMemo, useContext} from 'react';
import type {PropsWithChildren} from 'react';

import {HtmlContext} from '../context';
import {HYDRATION_ATTRIBUTE} from '../utilities/hydration';

interface Props {
  /**
   * A unique identifier for this component. This identifier is used
   * to find the rendered markup for this component while in the “deferred
   * hydration” state.
   */
  id?: string;
  render: boolean;
}

/**
 * A component that allows you to implement the “deferred hydration” pattern.
 * When the `render` is set to `true`, this component will render its `children`
 * as you would usually expect. When `render` is `false`, this component will
 * instead attempt to read the initial, server-rendered markup for this component,
 * and use that directly.
 *
 * Most users of Quilt will not need to use this component directly. The
 * `createAsyncComponent` function from `@quilted/quilt` (or
 * `@quilted/react-async`) uses this component under the hood to implement
 * its `hydrate` option.
 */
export function Hydrator({id, render, children}: PropsWithChildren<Props>) {
  const manager = useContext(HtmlContext);
  const [hydrationId, hydrationContent] = useMemo(() => {
    const hydrationId = manager.hydrationId(id);
    return [hydrationId, manager.getHydration(hydrationId) ?? ''] as const;
  }, [id, manager]);
  const hydrationProps = {[HYDRATION_ATTRIBUTE]: hydrationId};

  return render ? (
    <div {...hydrationProps}>{children}</div>
  ) : (
    <div
      {...hydrationProps}
      dangerouslySetInnerHTML={{
        __html: hydrationContent,
      }}
    />
  );
}
