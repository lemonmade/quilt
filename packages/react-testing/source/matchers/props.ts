import type {MatcherState} from 'expect';
import {
  matcherHint,
  printReceived,
  printExpected,
  RECEIVED_COLOR as receivedColor,
} from 'jest-matcher-utils';

import type {Node} from '../types.ts';

import {assertIsNode, diffPropsForNode} from './utilities.ts';

export function toHaveReactProps<Props>(
  this: MatcherState,
  node: Node<Props, any>,
  props: Partial<Props>,
) {
  assertIsNode(node, {
    expectation: 'toHaveReactProps',
    isNot: this.isNot,
  });

  if (props == null || typeof props !== 'object') {
    return {
      pass: false,
      message: () =>
        `You passed ${
          props == null ? String(props) : `a ${typeof props}`
        } as props, but it must be an object.`,
    };
  }

  const pass = Object.keys(props).every((key) =>
    this.equals((props as any)[key], (node.props as any)[key]),
  );

  const message = pass
    ? () =>
        `${matcherHint('.not.toHaveReactProps', node.toString())}\n\n` +
        `Expected the React element:\n  ${receivedColor(node.toString())}\n` +
        `Not to have props:\n  ${printExpected(props)}\n` +
        `Received:\n  ${printReceived(node.props)}\n`
    : () => {
        const diffString = diffPropsForNode(node, props, {
          expand: this.expand,
        });

        return (
          `${matcherHint('.toHaveReactProps', node.toString())}\n\n` +
          `Expected the React element:\n  ${receivedColor(node.toString())}\n` +
          `To have props:\n  ${printExpected(props)}\n` +
          `Received:\n  ${printReceived(node.props)}\n${
            diffString ? `Difference:\n${diffString}\n` : ''
          }`
        );
      };

  return {pass, message};
}
