import type {MatcherContext} from 'expect';
import {
  matcherHint,
  printExpected,
  EXPECTED_COLOR as expectedColor,
} from 'jest-matcher-utils';

import type {GraphQLAnyOperation} from '../types';
import type {GraphQLController, GraphQLRequest} from '../fixtures';
import {normalizeOperation} from '../utilities/ast';

import {assertIsGraphQLController, diffVariables} from './utilities';

export function toHavePerformedGraphQLOperation<Variables>(
  this: MatcherContext,
  graphql: GraphQLController,
  operation: GraphQLAnyOperation<any, Variables>,
  variables?: Variables,
) {
  assertIsGraphQLController(graphql, {
    expectation: 'toHavePerformedGraphQLOperation',
    isNot: this.isNot,
  });

  const foundByOperation = graphql.completed.all({
    operation,
  });

  const foundByVariables =
    variables == null
      ? foundByOperation
      : foundByOperation.filter((operation) =>
          Object.keys(variables).every((key) =>
            this.equals(
              (variables as any)[key],
              (operation.variables ?? ({} as any))[key],
            ),
          ),
        );

  const pass = foundByVariables.length > 0;
  const {name} = normalizeOperation(operation as any);

  const message = pass
    ? () =>
        `${matcherHint('.not.toHavePerformedGraphQLOperation')}\n\n` +
        `Expected not to have performed GraphQL operation:\n  ${expectedColor(
          name,
        )}\n${
          variables
            ? `With variables matching:\n  ${printExpected(variables)}\n`
            : ''
        }` +
        `But ${foundByVariables.length} matching ${
          foundByVariables.length === 1 ? 'operation was' : 'operations were'
        } found.\n`
    : () =>
        `${
          `${matcherHint('.toHavePerformedGraphQLOperation')}\n\n` +
          `Expected to have performed GraphQL operation:\n  ${expectedColor(
            name,
          )}\n${
            variables
              ? `With variables matching:\n  ${printExpected(variables)}\n`
              : ''
          }`
        }${
          foundByOperation.length === 0
            ? `But no matching operations were found.\n`
            : `But the ${
                foundByVariables.length === 1
                  ? 'found operation has'
                  : 'found operations have'
              } the following variable differences:\n\n${diffs(
                foundByVariables,
                variables! as any,
                this.expand,
              )}`
        }`;

  return {pass, message};
}

function diffs(
  requests: GraphQLRequest<unknown, unknown>[],
  variables: Record<string, any>,
  expand?: boolean,
) {
  return requests.reduce<string>(
    (diffs, request, index) =>
      `${diffs}${index === 0 ? '' : '\n\n'}${normalizedDiff(
        request,
        variables,
        {
          expand,
          showLegend: index === 0,
        },
      )}`,
    '',
  );
}

function normalizedDiff(
  request: GraphQLRequest<unknown, unknown>,
  variables: Record<string, any>,
  {expand = false, showLegend = false},
) {
  const result =
    diffVariables(request.variables ?? ({} as any), variables, {
      expand,
    }) || '';

  return showLegend ? result : result.split('\n\n')[1];
}
