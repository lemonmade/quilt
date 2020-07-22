import {useEffect, useMemo, useReducer} from 'react';
import type {Reducer} from 'react';
import type {NoInfer} from '@quilted/useful-types';
import type {
  QueryOptions,
  GraphQLOperation,
  IfAllVariablesOptional,
} from '@quilted/graphql';
import {cacheKey as getCacheKey} from '@quilted/graphql';

import {useGraphQL} from './useGraphQL';

type QueryHookOptions<Data, Variables> = {skip?: boolean} & QueryOptions<
  Data,
  Variables
>;

interface State<Data> {
  key: string;
  data?: Data;
  error?: Error;
  loading: boolean;
}

type Action =
  | {type: 'reset'; key: string; data?: any}
  | {type: 'loading'; key: string}
  | {type: 'result'; key: string; data?: any; error?: Error};

export function useQuery<Data, Variables>(
  query: GraphQLOperation<Data, Variables>,
  ...optionsPart: IfAllVariablesOptional<
    Variables,
    [QueryHookOptions<Data, NoInfer<Variables>>?],
    [QueryHookOptions<Data, NoInfer<Variables>>]
  >
) {
  const {
    cache = true,
    skip = false,
    variables,
  }: QueryHookOptions<Data, Variables> = optionsPart[0] ?? ({} as any);

  const graphql = useGraphQL();
  const cacheKey = getCacheKey(query, variables);
  const initialData = useMemo(
    () =>
      cache && !skip ? graphql.read<Data, Variables>(cacheKey) : undefined,
    [cache, skip, cacheKey, graphql],
  );

  const [state, dispatch] = useReducer<
    Reducer<State<Data>, Action>,
    {key: string; data?: Data}
  >(reducer, {key: cacheKey, data: initialData}, initialize);

  // eslint-disable-next-line prefer-const
  let {key: stateKey, ...returnState} = state;

  if (stateKey !== cacheKey) {
    dispatch({type: 'reset', key: cacheKey, data: initialData});
    returnState = {data: initialData, loading: initialData == null};
  }

  useEffect(() => {
    if (skip) return;

    let valid = true;

    dispatch({type: 'loading', key: cacheKey});

    (async () => {
      const result = await (graphql.query as any)(query, {variables});
      if (valid) dispatch({type: 'result', key: cacheKey, ...result});
    })();

    return () => {
      valid = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey, skip]);

  return returnState;
}

function initialize<Data>({
  key,
  data,
}: {
  key: string;
  data?: Data;
}): State<Data> {
  return {key, data, loading: data == null};
}

function reducer<Data>(state: State<Data>, action: Action): State<Data> {
  if (action.key !== state.key) return state;

  switch (action.type) {
    case 'reset':
      return initialize(action.data);
    case 'loading':
      return {...state, loading: true};
    case 'result':
      return {
        key: state.key,
        loading: false,
        data: action.data,
        error: action.error,
      };
    default:
      throw new Error();
  }
}
