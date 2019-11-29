import React, {ScriptHTMLAttributes} from 'react';

export interface Props extends ScriptHTMLAttributes<HTMLScriptElement> {
  src: string;
}

export function Script(props: Props) {
  return <script type="text/javascript" {...props} />;
}
