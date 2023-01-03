import {type GraphQLOperation} from '@quilted/quilt';
import {type TypedDocumentNode} from '@apollo/client';
import {parse} from 'graphql';

export function parseDocument<Data, Variables>({
  source,
}: GraphQLOperation<Data, Variables>): TypedDocumentNode<Data, Variables> {
  return parse(source) as any;
}
