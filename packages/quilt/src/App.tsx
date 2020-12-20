import React from 'react';
import type {PropsWithChildren} from 'react';

import {Router, useInitialUrl} from '@quilted/react-router';
import {GraphQLContext} from '@quilted/react-graphql';
import type {GraphQL} from '@quilted/react-graphql';
import {useHtmlUpdater} from '@quilted/react-html';

import {maybeWrapContext} from './utilities/react';

interface Props {
  graphql?: GraphQL;
}

export function App({children, graphql}: PropsWithChildren<Props>) {
  useHtmlUpdater();

  const initialUrl = useInitialUrl();

  return maybeWrapContext(
    GraphQLContext,
    graphql,
    <Router url={initialUrl}>{children}</Router>,
  );
}
