import type {PropsWithChildren, ComponentProps} from 'react';

import {Router, useInitialUrl} from '@quilted/react-router';
import {GraphQLContext} from '@quilted/react-graphql';
import {HttpContext} from '@quilted/react-http';
import type {GraphQL} from '@quilted/react-graphql';
import {useHtmlUpdater} from '@quilted/react-html';

import {maybeWrapContext} from './utilities/react';

type RouterProps = ComponentProps<typeof Router>;

interface Props {
  graphql?: GraphQL;
  routerState?: RouterProps['state'];
  routerPrefix?: RouterProps['prefix'];
  urlIsExternal?: RouterProps['isExternal'];
}

export function App({
  children,
  graphql,
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
          {children}
        </Router>,
      )}
    </HttpContext>
  );
}
