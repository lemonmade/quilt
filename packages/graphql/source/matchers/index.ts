import {expect} from '@jest/globals';

import type {GraphQLAnyOperation} from '../types';
import {toHavePerformedGraphQLOperation} from './operations';

declare global {
  // As far as I know, this is needed for the module augmentation  to work.
  // eslint-disable-next-line @typescript-eslint/no-namespace
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
