import React, {useMemo, useContext, ReactNode} from 'react';

import {HtmlContext} from '../../context';
import {HYDRATION_ATTRIBUTE} from '../../utilities/hydration';

interface Props {
  id?: string;
  render: boolean;
  children: ReactNode;
}

export function Hydrator({id, render, children}: Props) {
  const manager = useContext(HtmlContext);
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
