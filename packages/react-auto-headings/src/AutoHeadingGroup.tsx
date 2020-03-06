import React, {ReactNode} from 'react';
import {HeadingLevel, AutoHeadingContext, useAutoHeadingLevel} from './context';

interface Props {
  level?: HeadingLevel;
  children?: ReactNode;
}

export function AutoHeadingGroup({children, level: explicitLevel}: Props) {
  const currentLevel = useAutoHeadingLevel();

  if (
    currentLevel != null &&
    explicitLevel != null &&
    explicitLevel > currentLevel
  ) {
    throw new Error(
      `You are trying to nest a heading group with level ${explicitLevel} inside a context where the current heading level is ${currentLevel}. This will create a broken document outline.`,
    );
  }

  const level = explicitLevel ?? (currentLevel ?? 1) + 1;

  return (
    <AutoHeadingContext.Provider value={level as HeadingLevel}>
      {children}
    </AutoHeadingContext.Provider>
  );
}
