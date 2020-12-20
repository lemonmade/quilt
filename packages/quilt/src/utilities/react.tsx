import React from 'react';
import type {Context as ReactContext, ReactNode, ReactElement} from 'react';

export function maybeWrapContext<T>(
  Context: ReactContext<T>,
  value: T | null | undefined,
  children: ReactNode,
): ReactElement {
  return value ? (
    <Context.Provider value={value}>{children}</Context.Provider>
  ) : (
    (children as any)
  );
}
