import React, {useEffect, useContext} from 'react';

import {useCurrentUrl, useRouter, useMatch} from '../../hooks';
import {SwitchContext} from '../../context';
import type {Match} from '../../types';
import {REGISTER, NavigateTo} from '../../router';

import {Redirect} from '../Redirect';

interface Props {
  match: Match;
  redirect?: NavigateTo | ((url: URL) => NavigateTo);
  render?(url: URL): React.ReactElement;
  // need to add renderPreload
  renderPrefetch?(url: URL): React.ReactElement;
}

export function Route({match, render, redirect, renderPrefetch}: Props) {
  const url = useCurrentUrl();
  const router = useRouter();
  const switcher = useContext(SwitchContext);

  useEffect(() => {
    if (renderPrefetch == null) {
      return;
    }

    return router[REGISTER]({match, render: renderPrefetch});
  }, [match, renderPrefetch, router]);

  const matches = useMatch(match);
  const normalizedRender = matches
    ? render ?? renderFromRedirect(redirect)
    : null;

  if (!matches || normalizedRender == null) {
    return null;
  }

  if (switcher) {
    switcher.matched();
  }

  return normalizedRender(url);
}

function renderFromRedirect(redirect: Props['redirect']) {
  if (redirect == null) {
    return;
  }

  return (url: URL) => {
    const to = typeof redirect === 'function' ? redirect(url) : redirect;
    return <Redirect to={to} />;
  };
}
