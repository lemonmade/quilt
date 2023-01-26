import type {ReactElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';

export function renderHtmlToString(
  tree: ReactElement<any>,
  {doctype = '<!DOCTYPE html>'} = {},
) {
  return `${doctype}${renderToStaticMarkup(tree)}`;
}
