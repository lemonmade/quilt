import type {GraphQLAnyOperation} from '../types';
import {toHavePerformedGraphQLOperation} from './operations';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    // eslint-disable-next-line @typescript-eslint/ban-types
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
