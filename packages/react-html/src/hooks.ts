import {useContext, useMemo, useEffect, useRef} from 'react';
import {
  useServerEffect,
  ServerRenderEffectOptions,
} from '@quilted/react-server-render';

import {HtmlContext} from './context';
import {HtmlManager, EFFECT} from './manager';
import {updateOnClient} from './utilities';

type FirstArgument<T> = T extends (arg: infer U, ...rest: any[]) => any
  ? U
  : never;

export function useSerialized<T>(
  id: string,
  serialize: () => T | Promise<T>,
): T | undefined {
  const manager = useContext(HtmlContext);
  const data = useMemo(() => manager.getSerialization<T>(id), [id, manager]);

  useServerDomEffect(
    (manager) => {
      const result = serialize();
      const handleResult = manager.setSerialization.bind(manager, id);
      return isPromise(result)
        ? result.then(handleResult)
        : handleResult(result);
    },
    {deferred: true},
  );

  return data;
}

function isPromise<T>(
  maybePromise: T | Promise<T>,
): maybePromise is Promise<T> {
  return maybePromise != null && 'then' in (maybePromise as any);
}

export function useDomEffect(
  perform: (manager: HtmlManager) => () => void,
  inputs: unknown[] = [],
) {
  const manager = useContext(HtmlContext);
  const effect = () => {
    perform(manager);
  };

  useServerEffect(effect, manager[EFFECT]);
  useEffect(effect, [manager, ...inputs]);
}

export function useTitle(title: string) {
  useDomEffect((manager) => manager.addTitle(title), [title]);
}

export function useLink(link: React.HTMLProps<HTMLLinkElement>) {
  useDomEffect((manager) => manager.addLink(link), [JSON.stringify(link)]);
}

export function useMeta(meta: React.HTMLProps<HTMLMetaElement>) {
  useDomEffect((manager) => manager.addMeta(meta), [JSON.stringify(meta)]);
}

export function usePreconnect(source: string) {
  useDomEffect(
    (manager) =>
      manager.addLink({
        rel: 'preconnect',
        href: source,
      }),
    [source],
  );
}

export function useFavicon(source: string) {
  useDomEffect(
    (manager) =>
      manager.addLink({
        rel: 'shortcut icon',
        type: 'image/x-icon',
        href: source,
      }),
    [source],
  );
}

export function useLocale(locale: string) {
  useDomEffect((manager) => manager.addHtmlAttributes({lang: locale}), [
    locale,
  ]);
}

export function useHtmlAttributes(
  htmlAttributes: FirstArgument<HtmlManager['addHtmlAttributes']>,
) {
  useDomEffect((manager) => manager.addHtmlAttributes(htmlAttributes), [
    JSON.stringify(htmlAttributes),
  ]);
}

export function useBodyAttributes(
  bodyAttributes: FirstArgument<HtmlManager['addBodyAttributes']>,
) {
  useDomEffect((manager) => manager.addBodyAttributes(bodyAttributes), [
    JSON.stringify(bodyAttributes),
  ]);
}

export function useHtmlUpdater() {
  const queuedUpdate = useRef<number | null>(null);

  useClientDomEffect((manager) => {
    return manager.subscribe((state) => {
      if (queuedUpdate.current) {
        cancelAnimationFrame(queuedUpdate.current);
      }

      queuedUpdate.current = requestAnimationFrame(() => {
        updateOnClient(state);
      });
    });
  });
}

export function useClientDomEffect(
  perform: (manager: HtmlManager) => void,
  inputs: unknown[] = [],
) {
  const manager = useContext(HtmlContext);

  useEffect(() => {
    perform(manager);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manager, perform, ...inputs]);
}

export function useServerDomEffect(
  perform: (manager: HtmlManager) => void,
  options?: ServerRenderEffectOptions,
) {
  const manager = useContext(HtmlContext);
  useServerEffect(() => perform(manager), manager[EFFECT], options);
}
