// This represents a simplified version of `graphql-config`. That project has
// a lot of extra dependencies, and was causing some issues in ESM environments,
// so I wrote my own version. The `./project` directory contains the code for
// actually reading these configuration types into a “project” concept.
//
// @see https://www.graphql-config.com/docs/user/user-introduction

export interface GraphQLProject {
  schema: string | string[];
  documents?: string | string[];
  exclude?: string | string[];
  extensions?: Partial<Extensions>;
}

export interface GraphQLProjectMap {
  projects: Record<string, GraphQLProject>;
}

export type Configuration = GraphQLProject | GraphQLProjectMap;

export interface Extensions {
  quilt?: QuiltExtensions;
}

export interface QuiltExtensions {
  schema?: SchemaOutputKind[];
  documents?: DocumentOutputKind[];
  customScalars?: PrintSchemaOptions['customScalars'];
}

export interface PrintSchemaOptions {
  kind: SchemaOutputKind;
  customScalars?: Record<string, ScalarDefinition>;
}

export interface ScalarDefinition {
  name: string;
  package?: string;
}

export interface SchemaOutputKindInputTypes {
  kind: 'inputTypes';
  outputPath?: string;
}

export interface SchemaOutputKindOutputTypes {
  kind: 'outputTypes';
  outputPath?: string;
}

export interface SchemaOutputKindDefinitions {
  kind: 'definitions';
  outputPath?: string;
}

export interface SchemaOutputKindGraphQL {
  kind: 'graphql';
  outputPath: string;
}

export type SchemaOutputKind =
  | SchemaOutputKindInputTypes
  | SchemaOutputKindOutputTypes
  | SchemaOutputKindDefinitions
  | SchemaOutputKindGraphQL;

export interface DocumentOutputKind {
  kind: 'value' | 'types';
  match?: string[];
  addTypename?: boolean;
}
