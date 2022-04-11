import type {GraphQLSchema} from 'graphql';
import type {Extensions} from '../configuration';

export interface GraphQLConfiguration {
  readonly projects: Record<string, GraphQLProjectConfiguration>;
}

export interface GraphQLProjectConfiguration {
  readonly name: string;
  readonly root: string;
  readonly schemaPatterns: string[];
  readonly documentPatterns: string[];
  readonly excludePatterns: string[];
  readonly extensions: Partial<Extensions>;
  getSchema(): Promise<GraphQLSchema>;
}
