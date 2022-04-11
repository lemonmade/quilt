import {createContext} from 'react';
import type {GraphQL} from '@quilted/graphql';

export const GraphQLContext = createContext<GraphQL | undefined>(undefined);
