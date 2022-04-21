import {useContext} from 'react';
import type {Context} from 'react';

export interface UseContextHook<T> {
  <Required extends boolean = true>(options?: {
    required?: Required;
  }): Required extends true ? NonNullable<T> : NonNullable<T> | undefined;
}

export function createUseContextHook<T>(
  Context: Context<T>,
  {whenMissing}: {whenMissing?(): Error} = {},
): UseContextHook<T> {
  return ({required = true} = {}) => {
    const contextValue = useContext(Context) ?? undefined;

    if (contextValue == null && required) {
      const error =
        whenMissing?.() ?? new Error(`Missing context: ${Context.displayName}`);

      throw error;
    }

    return contextValue!;
  };
}
