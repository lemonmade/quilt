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

export interface SchemaOutputKindInputTypes {
  kind: 'inputTypes';
  outputPath: string;
}

export interface SchemaOutputKindOutputTypes {
  kind: 'outputTypes';
  outputPath?: string;
}

export interface SchemaOutputKindDefinitions {
  kind: 'definitions';
  outputPath?: string;
}

export type SchemaOutputKind =
  | SchemaOutputKindInputTypes
  | SchemaOutputKindOutputTypes
  | SchemaOutputKindDefinitions;

export interface DocumentOutputKind {
  kind: 'value' | 'types';
  match?: string[];
  addTypename?: boolean;
}
