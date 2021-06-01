import {expect} from '@jest/globals';

import type {GraphQLAnyOperation} from '../types';
import {toHavePerformedGraphQLOperation} from './operations';

declare global {
  namespace jest {
    interface Matchers<R, T = {}> {
      toHavePerformedGraphQLOperation<Variables>(
        document: GraphQLAnyOperation<any, Variables>,
        variables?: Partial<Variables>,
      ): void;
    }
  }
}

expect.extend({
  toHavePerformedGraphQLOperation,
});
