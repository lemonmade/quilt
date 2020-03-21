import React, {useMemo, ReactNode} from 'react';

import {useHtmlManager} from '../../hooks';
import {HYDRATION_ATTRIBUTE} from '../../utilities';

interface Props {
  id?: string;
  render: boolean;
  children: ReactNode;
}

export function Hydrator({id, render, children}: Props) {
  const manager = useHtmlManager();
  const hydrationId = useMemo(() => manager.hydrationId(id), [id, manager]);
  const hydrationProps = {[HYDRATION_ATTRIBUTE]: hydrationId};

  return render ? (
    <div {...hydrationProps}>{children}</div>
  ) : (
    <div
      {...hydrationProps}
      dangerouslySetInnerHTML={{
        __html: manager.getHydration(hydrationId) ?? '',
      }}
    />
  );
}
