import type {PropsWithChildren, ComponentProps} from 'react';

import {Routing, useInitialUrl, RoutePreloading} from '@quilted/react-router';
import {HttpContext} from '@quilted/react-http';
import {GraphQLContext} from '@quilted/react-graphql';
import type {GraphQL} from '@quilted/react-graphql';
import {useHtmlUpdater} from '@quilted/react-html';
import {PerformanceContext} from '@quilted/react-performance';
import type {Performance} from '@quilted/react-performance';

import {maybeWrapContext} from './utilities/react';

type RoutingProps = ComponentProps<typeof Routing>;

interface Props {
  graphql?: GraphQL;
  performance?: Performance;
  routerState?: RoutingProps['state'];
  routerPrefix?: RoutingProps['prefix'];
  urlIsExternal?: RoutingProps['isExternal'];
}

export function App({
  children,
  graphql,
  performance,
  routerState,
  routerPrefix,
  urlIsExternal,
}: PropsWithChildren<Props>) {
  useHtmlUpdater();

  const initialUrl = useInitialUrl();

  return (
    <HttpContext>
      {maybeWrapContext(
        GraphQLContext,
        graphql,
        <Routing
          url={initialUrl}
          state={routerState}
          prefix={routerPrefix}
          isExternal={urlIsExternal}
        >
          <RoutePreloading>
            <PerformanceContext performance={performance}>
              {children}
            </PerformanceContext>
          </RoutePreloading>
        </Routing>,
      )}
    </HttpContext>
  );
}
