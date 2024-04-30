import JSCookie from 'js-cookie';
import {
  effect,
  signal,
  isSignal,
  type Signal,
  type ReadonlySignal,
} from '@quilted/signals';

import type {BrowserDetails, CookieOptions, Cookies} from './types.ts';

export class Browser implements BrowserDetails {
  readonly title = new BrowserTitle();
  readonly meta = new BrowserHeadElements('meta');
  readonly link = new BrowserHeadElements('link');
  readonly cookies = new BrowserCookies();
  readonly serializations = new BrowserSerializations();
  readonly initialURL = new URL(window.location.href);
}

export class BrowserCookies implements Cookies {
  private readonly cookieSignals = signal(
    new Map<string, Signal<string>>(
      Object.entries(JSCookie.get()).map(([cookie, value]) => [
        cookie,
        signal(value),
      ]),
    ),
  );

  has(cookie: string) {
    return this.cookieSignals.value.get(cookie)?.value != null;
  }

  get(cookie: string) {
    return this.cookieSignals.value.get(cookie)?.value;
  }

  set(cookie: string, value: string, options?: CookieOptions) {
    JSCookie.set(cookie, value, options);
    this.updateCookie(cookie);
  }

  delete(cookie: string, options?: CookieOptions) {
    JSCookie.remove(cookie, options);
    this.updateCookie(cookie);
  }

  *entries() {
    const cookies = this.cookieSignals.peek();

    for (const [cookie, signal] of cookies) {
      yield [cookie, signal.peek()] as const;
    }
  }

  *[Symbol.iterator]() {
    yield* this.cookieSignals.peek().keys();
  }

  private updateCookie(cookie: string) {
    const value = JSCookie.get(cookie);
    const cookieSignals = this.cookieSignals.peek();
    const cookieSignal = cookieSignals.get(cookie);

    if (value) {
      if (cookieSignal) {
        cookieSignal.value = value;
      } else {
        const newCookie = signal(value);
        const newCookies = new Map(cookieSignals);
        newCookies.set(cookie, newCookie);
        this.cookieSignals.value = newCookies;
      }
    } else if (cookieSignal) {
      const newCookies = new Map(cookieSignals);
      newCookies.delete(cookie);
      this.cookieSignals.value = newCookies;
    }
  }
}

export class BrowserTitle {
  private titleElement = document.head.querySelector('title');
  private titleValues = signal<Signal<string>[]>([]);

  add = (title: string | ReadonlySignal<string>) => {
    const titleSignal = isSignal(title) ? title : signal(title);
    const newTitleValues = [...this.titleValues.peek(), titleSignal];
    this.titleValues.value = newTitleValues;
    return () => {
      this.titleValues.value = this.titleValues.value.filter(
        (existingTitle) => existingTitle !== titleSignal,
      );
    };
  };

  constructor() {
    effect(() => {
      const title = this.titleValues.value.at(-1)?.value;
      if (title == null) return;

      if (this.titleElement) {
        this.titleElement.textContent = title;
      } else {
        this.titleElement = document.createElement('title');
        this.titleElement.textContent = title;
        document.head.appendChild(this.titleElement);
      }
    });
  }
}

export class BrowserHeadElements<Element extends keyof HTMLElementTagNameMap> {
  private initialElements: readonly HTMLElementTagNameMap[Element][];

  constructor(selector: Element) {
    this.initialElements = Array.from(document.head.querySelectorAll(selector));
  }

  add = (
    attributes:
      | HTMLElementTagNameMap[Element]
      | ReadonlySignal<HTMLElementTagNameMap[Element]>,
  ) => {
    const meta = document.createElement('meta');

    for (const [attribute, value] of Object.entries(attributes)) {
      meta.setAttribute(attribute, value);
    }

    const existingMeta = this.initialElements.find((existingMeta) => {
      return meta.isEqualNode(existingMeta);
    });

    const resolvedMeta = existingMeta ?? meta;

    if (!existingMeta) {
      document.head.appendChild(resolvedMeta);
    }

    let teardown: undefined | (() => void);

    if (isSignal(attributes)) {
      teardown = effect(() => {
        const updatedAttributes = attributes.value;
        if (!teardown) return;

        for (const [attribute, value] of Object.entries(updatedAttributes)) {
          meta.setAttribute(attribute, value);
        }
      });
    }

    return () => {
      resolvedMeta.remove();
      teardown?.();
    };
  };
}

export class BrowserSerializations {
  private readonly serializations = new Map<string, unknown>(
    Array.from(
      document.querySelectorAll<HTMLMetaElement>(`meta[name^="serialized"]`),
    ).map((node) => [
      node.name.replace(/^serialized-/, ''),
      getSerializedFromNode(node),
    ]),
  );

  get(id: string) {
    return this.serializations.get(id) as any;
  }

  set(id: string, data: unknown) {
    if (data === undefined) {
      this.serializations.delete(id);
    } else {
      this.serializations.set(id, data);
    }
  }

  *[Symbol.iterator]() {
    yield* this.serializations;
  }
}

function getSerializedFromNode<T = unknown>(node: Element): T | undefined {
  const value = (node as HTMLMetaElement).content;

  try {
    return value ? JSON.parse(value) : undefined;
  } catch {
    return undefined;
  }
}
