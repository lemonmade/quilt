import type {MatcherState} from 'expect';
import {
  matcherHint,
  printReceived,
  printExpected,
  RECEIVED_COLOR as receivedColor,
} from 'jest-matcher-utils';

import type {Node} from '../types.ts';

import {toHavePreactProps} from './props.ts';
import {assertIsNode, printReceivedWithHighlight} from './utilities.ts';

export function toContainPreactHTML<Props>(
  this: MatcherState,
  node: Node<Props>,
  text: string,
) {
  assertIsNode(node, {
    expectation: 'toContainPreactHTML',
    isNot: this.isNot,
  });

  const nodeHTML = node.html;
  const matchIndex = nodeHTML.indexOf(text);
  const pass = matchIndex >= 0;

  const message = pass
    ? () =>
        `${matcherHint('.not.toContainPreactHTML', node.toString())}\n\n` +
        `Expected the Preact element:\n  ${receivedColor(node.toString())}\n` +
        `Not to contain HTML:\n  ${printExpected(text)}\n` +
        `But it did:\n  ${printReceivedWithHighlight(
          nodeHTML,
          matchIndex,
          text.length,
        )}\n`
    : () =>
        `${matcherHint('.not.toContainPreactHTML', node.toString())}\n\n` +
        `Expected the Preact element:\n  ${receivedColor(node.toString())}\n` +
        `With HTML content:\n  ${printReceived(nodeHTML)}\n` +
        `To contain HTML:\n  ${printExpected(text)}\n`;

  return {pass, message};
}

export function toHavePreactDataProps(
  this: MatcherState,
  node: Node<unknown>,
  data: {[key: string]: string},
) {
  return toHavePreactProps.call(this, node, data);
}
