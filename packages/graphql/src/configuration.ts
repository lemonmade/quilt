// @see https://www.graphql-config.com/docs/user/user-introduction
export type {IGraphQLConfig as Configuration} from 'graphql-config';

declare module 'graphql-config' {
  export interface IExtensions {
    quilt?: ConfigurationExtensions;
  }
}

export interface PrintSchemaOptions {
  kind: SchemaOutputKind;
  customScalars?: Record<string, ScalarDefinition>;
}

export interface ConfigurationExtensions {
  schema?: SchemaOutputKind[];
  documents?: DocumentOutputKind[];
  customScalars?: PrintSchemaOptions['customScalars'];
}

export interface ScalarDefinition {
  name: string;
  package?: string;
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
