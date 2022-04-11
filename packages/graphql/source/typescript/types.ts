import type {DocumentNode, GraphQLSchema} from 'graphql';

interface Operation {
  type: 'fragment' | 'query' | 'mutation';
  name?: string;
}

export interface DocumentDetails {
  path: string;
  document: DocumentNode;
  provides: Set<Operation>;
  dependencies: Set<string>;
}

export interface ProjectDetails {
  documents: Map<string, DocumentDetails>;
  schema: GraphQLSchema;
}
