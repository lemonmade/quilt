import {useContext, useEffect} from 'react';
import type {MutableRefObject} from 'react';

import {ROOT_SCROLL_RESTORATION_ID} from '../constants';
import {ScrollRestorationRegistrarContext} from '../context';

import {useIsomorphicEffect} from './effect';
import {useCurrentUrl} from './url';

interface ScrollRestorationHandler {
  (): boolean;
}

export type ScrollRestorationResult = MutableRefObject<HTMLElement | null>;

export function useRouteChangeScrollRestoration(
  handler?: ScrollRestorationHandler,
): ScrollRestorationResult;
export function useRouteChangeScrollRestoration(
  id: string,
  handler?: ScrollRestorationHandler,
): ScrollRestorationResult;
export function useRouteChangeScrollRestoration(
  idOrHandler?: string | ScrollRestorationHandler,
  maybeHandler?: ScrollRestorationHandler,
): ScrollRestorationResult {
  const currentUrl = useCurrentUrl();

  let id: string;
  let handler: ScrollRestorationHandler | undefined;

  if (typeof idOrHandler === 'string') {
    id = idOrHandler;
    handler = maybeHandler;
  } else {
    id = ROOT_SCROLL_RESTORATION_ID;
    handler = idOrHandler;
  }

  const registrar = useContext(ScrollRestorationRegistrarContext);

  if (registrar == null) {
    throw new Error(
      `Can’t perform scroll restoration because you are not rendered in a <Routing> component.`,
    );
  }

  const registration = registrar.get(id);
  registration.handler = handler;

  useIsomorphicEffect(() => {
    return () => {
      console.log(
        `useIsomorphicEffect Unmounting ${id} (key: ${currentUrl.key})`,
      );
    };
  }, [id, currentUrl.key]);

  useEffect(() => {
    return () => {
      console.log(`Unsetting ${id}`);
      if (id !== ROOT_SCROLL_RESTORATION_ID) {
        registration.ref.current = null;
      }

      if (registration.handler !== handler) {
        registration.handler = undefined;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return registration.ref;
}
