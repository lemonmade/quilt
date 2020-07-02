import {
  NoInfer,
  GraphQLDocument,
  IfAllVariablesOptional,
  QueryOptions,
} from '../types';

export function useQuery<Data, Variables>(
  query: GraphQLDocument<Data, Variables>,
  ...optionsPart: IfAllVariablesOptional<
    Variables,
    [QueryOptions<Data, NoInfer<Variables>>?],
    [QueryOptions<Data, NoInfer<Variables>>]
  >
) {}
