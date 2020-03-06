import React, {HTMLProps} from 'react';
import {useAutoHeadingLevel} from './context';

export function AutoHeading({
  accessibilityRole,
  ...props
}: HTMLProps<HTMLHeadingElement> & {accessibilityRole?: 'presentation'}) {
  const level = useAutoHeadingLevel();
  const Element =
    level == null || accessibilityRole === 'presentation' ? 'p' : `h${level}`;

  return <Element {...props} />;
}
