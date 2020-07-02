import {createContext} from 'react';

import type {GraphQL} from './client';

export const GraphQLContext = createContext<GraphQL | undefined>(undefined);
