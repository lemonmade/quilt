import type {PropsWithChildren, ComponentProps} from 'react';

import {Router, useInitialUrl} from '@quilted/react-router';
import {HttpContext} from '@quilted/react-http';
import {GraphQLContext} from '@quilted/react-graphql';
import type {GraphQL} from '@quilted/react-graphql';
import {useHtmlUpdater} from '@quilted/react-html';
import {PerformanceContext} from '@quilted/react-performance';
import type {Performance} from '@quilted/react-performance';

import {maybeWrapContext} from './utilities/react';

type RouterProps = ComponentProps<typeof Router>;

interface Props {
  graphql?: GraphQL;
  performance?: Performance;
  routerState?: RouterProps['state'];
  routerPrefix?: RouterProps['prefix'];
  urlIsExternal?: RouterProps['isExternal'];
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
        <Router
          url={initialUrl}
          state={routerState}
          prefix={routerPrefix}
          isExternal={urlIsExternal}
        >
          <PerformanceContext performance={performance}>
            {children}
          </PerformanceContext>
        </Router>,
      )}
    </HttpContext>
  );
}
