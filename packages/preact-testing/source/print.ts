import {stringify} from 'jest-matcher-utils';

import type {DebugOptions, Node} from './types.ts';

const HIDE_NODE_CHILDREN = ['svg'];

export function toReactString<Props>(
  node: Node<Props> | string,
  options: DebugOptions = {},
  level = 0,
): string {
  if (typeof node === 'string') return node;

  // if this is an array node then print all children at the current level
  if (!node.type && node.children.length > 0) {
    return node.children
      .map((child) => toReactString(child, options, level))
      .join('\n');
  }

  const name = nodeName(node);
  const indent = '  '.repeat(level);
  const props = Object.keys(node.props as any)
    // we always filter out children no matter what, but unless all option
    // is present we will also filter out DOM implementation details
    .filter((key) =>
      options.all
        ? key !== 'children'
        : !/^(children|className)$|^(aria|data)-/.test(key),
    )
    .reduce<string[]>((list, key) => {
      if (!key) {
        return list;
      }

      const value = (node.props as any)[key];

      if (value === undefined && !options.all) {
        return list;
      }

      list.push(toPropString(key, value, options.verbosity));

      return list;
    }, []);

  const hasChildren =
    node.children.length > 0 && !HIDE_NODE_CHILDREN.includes(name);

  const open = `${indent}<${name}${
    props.length > 0 ? ` ${props.join(' ')}` : ''
  }${hasChildren ? '>' : ' />'}`;

  if (!hasChildren) {
    return open;
  }

  const close = `${indent}</${name}>`;

  if (options.depth != null && level >= options.depth) {
    return [
      open,
      `${indent}  {/* <${node.children.length} child${
        node.children.length === 1 ? '' : 'ren'
      }... /> */}`,
      close,
    ].join('\n');
  }

  return [
    open,
    ...node.children.map((child) => toReactString(child, options, level + 1)),
    close,
  ].join('\n');
}

export function toPropString(key: string, value: unknown, verbosity = 1) {
  if (value === undefined) {
    return `${key}={undefined}`;
  }

  if (value === null) {
    return `${key}={null}`;
  }

  if (typeof value === 'string') {
    return `${key}="${value}"`;
  }

  if (typeof value === 'boolean' && value) {
    return value ? `${key}` : `${key}={false}`;
  }

  if (value instanceof Array) {
    return `${key}={${stringify(value, verbosity + 1)}}`;
  }

  return `${key}={${stringify(value, verbosity)}}`;
}

export function nodeName<Props>({type}: Node<Props>) {
  if (type && typeof type === 'object' && '_context' in type) {
    const context = (type as any)._context;
    return `${context.displayName ?? 'Context'}.${
      type === context.Provider ? 'Provider' : 'Consumer'
    }`;
  }

  if (type == null) {
    return 'Node';
  }

  return typeof type === 'string'
    ? type
    : type.displayName ?? type.name ?? 'Component';
}
