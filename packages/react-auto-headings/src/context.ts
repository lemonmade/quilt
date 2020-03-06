import {createContext, useContext} from 'react';

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export const AutoHeadingContext = createContext<HeadingLevel | undefined>(
  undefined,
);

export function useAutoHeadingLevel() {
  return useContext(AutoHeadingContext);
}
