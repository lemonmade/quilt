import type {ComponentType} from 'preact';
import type {MatcherState, MatcherUtils} from 'expect';
import {
  matcherHint,
  printExpected,
  EXPECTED_COLOR as expectedColor,
  RECEIVED_COLOR as receivedColor,
} from 'jest-matcher-utils';

import {Node, PropsFor} from '../types.ts';

import {
  assertIsNode,
  assertIsType,
  diffs,
  pluralize,
  printType,
  getObjectSubset,
} from './utilities.ts';

export function toContainPreactComponent<
  Type extends string | ComponentType<any>,
>(
  this: MatcherState & MatcherUtils,
  node: Node<any>,
  type: Type,
  props?: Partial<PropsFor<Type>>,
) {
  assertIsNode(node, {
    expectation: 'toContainPreactComponent',
    isNot: this.isNot,
  });

  assertIsType(type, {
    expectation: 'toContainPreactComponent',
    isNot: this.isNot,
  });

  const foundByType = node.findAll(type);
  const foundByProps =
    props == null
      ? foundByType
      : foundByType.filter((element) =>
          this.equals(props, getObjectSubset(element.props, props)),
        );

  const pass = foundByProps.length > 0;

  const message = pass
    ? () =>
        `${matcherHint('.not.toContainPreactComponent')}\n\n` +
        `Expected the Preact element:\n  ${receivedColor(node.toString())}\n` +
        `Not to contain component:\n  ${expectedColor(printType(type))}\n${
          props ? `With props matching:\n  ${printExpected(props)}\n` : ''
        }` +
        `But ${foundByProps.length} matching ${printType(type)} ${
          foundByProps.length === 1 ? 'elements were' : 'element was'
        } found.\n`
    : () =>
        `${
          `${matcherHint('.toContainPreactComponent')}\n\n` +
          `Expected the Preact element:\n  ${receivedColor(
            node.toString(),
          )}\n` +
          `To contain component:\n  ${expectedColor(printType(type))}\n${
            props ? `With props matching:\n  ${printExpected(props)}\n` : ''
          }`
        }${
          foundByType.length === 0
            ? `But no matching ${printType(type)} elements were found.\n`
            : `But the ${
                foundByType.length === 1
                  ? 'found element has'
                  : 'found elements have'
              } the following prop differences:\n\n${diffs(
                foundByType,
                props!,
                this.expand,
              )}`
        }`;

  return {pass, message};
}

export function toContainPreactComponentTimes<
  Type extends string | ComponentType<any>,
>(
  this: MatcherState & MatcherUtils,
  node: Node<unknown>,
  type: Type,
  times: number,
  props?: Partial<PropsFor<Type>>,
) {
  assertIsNode(node, {
    expectation: 'toContainPreactComponentTimes',
    isNot: this.isNot,
  });

  assertIsType(type, {
    expectation: 'toContainPreactComponent',
    isNot: this.isNot,
  });

  const foundByType = node.findAll(type);
  const foundByProps =
    props == null
      ? foundByType
      : foundByType.filter((element) =>
          this.equals(props, getObjectSubset(element.props, props)),
        );

  const pass = foundByProps.length === times;

  const message = pass
    ? () =>
        [
          `${matcherHint('.not.toContainPreactComponentTimes')}\n`,
          `Expected the Preact element:\n  ${receivedColor(node.toString())}`,
          `Not to contain component:\n  ${expectedColor(printType(type))}`,
          `${times} ${pluralize('time', times)}, but it did.`,
        ].join('\n')
    : () =>
        [
          `${matcherHint('.toContainPreactComponentTimes')}\n`,
          `Expected the Preact element:\n  ${receivedColor(node.toString())}`,
          `To contain component:\n  ${expectedColor(printType(type))}`,
          `${times} ${pluralize('time', times)}, but it was found ${
            foundByProps.length
          }.`,
        ].join('\n');

  return {pass, message};
}
