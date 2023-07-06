import {parse} from 'graphql';
import {type GraphQLOperation} from '@quilted/quilt/graphql';
import {type TypedDocumentNode} from '@apollo/client';

export function parseDocument<Data, Variables>({
  source,
}: GraphQLOperation<Data, Variables>): TypedDocumentNode<Data, Variables> {
  return parse(source) as any;
}
