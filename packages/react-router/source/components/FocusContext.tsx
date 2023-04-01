import {useRef, useEffect} from 'react';
import type {ReactNode} from 'react';

import {FocusContext as Context} from '../context.ts';
import {useCurrentUrl} from '../hooks/url.ts';
import type {Focusable} from '../types.ts';

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
