import type {ReactElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';

export function render(tree: ReactElement<any>) {
  return `<!DOCTYPE html>${renderToStaticMarkup(tree)}`;
}
