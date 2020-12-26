import {Readable} from 'stream';

import type {ReactElement} from 'react';
import {renderToStaticNodeStream} from 'react-dom/server';
import multistream from 'multistream';

// The typings for this package have not been updated to reflect
// that the default export is now **only** a constructor function.
const MultiStream: {
  new (...args: Parameters<typeof multistream>): ReturnType<typeof multistream>;
} = multistream as any;

export function stream(tree: ReactElement<any>) {
  const doctype = new Readable();
  doctype.push('<!DOCTYPE html>');
  doctype.push(null);

  return new MultiStream([doctype, renderToStaticNodeStream(tree)]);
}
