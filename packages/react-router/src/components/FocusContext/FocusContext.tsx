import React, {useRef, useEffect, ReactNode} from 'react';
import {FocusContext as Context} from '../../context';
import {useCurrentUrl} from '../../hooks';
import {Focusable} from '../../types';

export function FocusContext({children}: {children: ReactNode}) {
  const currentUrl = useCurrentUrl();
  const focusRef = useRef<Focusable>();
  const focus = () => {
    const target = focusRef.current ?? document.body;
    target.focus();
  };

  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
    } else {
      focus();
    }
  }, [currentUrl.pathname]);

  return <Context.Provider value={focusRef}>{children}</Context.Provider>;
}
