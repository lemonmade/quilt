import {useMemo, useRef, type ComponentProps} from 'react';
import {
  getApolloContext,
  ApolloProvider as BaseApolloProvider,
} from '@apollo/client';
import {RenderPromises} from '@apollo/client/react/ssr';
import {useSerialized} from '@quilted/quilt/html';

export function ApolloProvider({
  id = 'Quilt.Apollo',
  client,
  children,
  ...rest
}: ComponentProps<typeof BaseApolloProvider> & {id?: string}) {
  const ApolloContext = getApolloContext();
  const apolloContext = useMemo(() => {
    return {renderPromises: new RenderPromises()};
  }, []);

  const data = useSerialized<any>(id, () => {
    if (apolloContext.renderPromises.hasPromises()) {
      return apolloContext.renderPromises
        .consumeAndAwaitPromises()
        .then(() => client.extract());
    }

    return client.extract();
  });

  const restoreRef = useRef<boolean>();

  if (data && !restoreRef.current) {
    restoreRef.current = true;
    client.restore(data);
  }

  return (
    <ApolloContext.Provider value={apolloContext}>
      <BaseApolloProvider client={client} {...rest}>
        {children}
      </BaseApolloProvider>
    </ApolloContext.Provider>
  );
}
