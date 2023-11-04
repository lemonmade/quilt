import type {MatcherState, MatcherUtils} from 'expect';
import {
  matcherHint,
  printReceived,
  printExpected,
  RECEIVED_COLOR as receivedColor,
} from 'jest-matcher-utils';

import type {Node, HTMLNodeExtensions} from '../types.ts';

import {toHaveReactProps} from './props.ts';
import {assertIsNode, printReceivedWithHighlight} from './utilities.ts';

export function toContainReactHTML<Props>(
  this: MatcherState,
  node: Node<Props, HTMLNodeExtensions>,
  text: string,
) {
  assertIsNode(node, {
    expectation: 'toContainReactHTML',
    isNot: this.isNot,
  });

  const nodeHTML = node.html;
  const matchIndex = nodeHTML.indexOf(text);
  const pass = matchIndex >= 0;

  const message = pass
    ? () =>
        `${matcherHint('.not.toContainReactHTML', node.toString())}\n\n` +
        `Expected the React element:\n  ${receivedColor(node.toString())}\n` +
        `Not to contain HTML:\n  ${printExpected(text)}\n` +
        `But it did:\n  ${printReceivedWithHighlight(
          nodeHTML,
          matchIndex,
          text.length,
        )}\n`
    : () =>
        `${matcherHint('.not.toContainReactHTML', node.toString())}\n\n` +
        `Expected the React element:\n  ${receivedColor(node.toString())}\n` +
        `With HTML content:\n  ${printReceived(nodeHTML)}\n` +
        `To contain HTML:\n  ${printExpected(text)}\n`;

  return {pass, message};
}

export function toHaveReactDataProps(
  this: MatcherState & MatcherUtils,
  node: Node<unknown>,
  data: {[key: string]: string},
) {
  return toHaveReactProps.call(this, node, data);
}
