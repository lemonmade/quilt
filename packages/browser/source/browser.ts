import JSCookie from 'js-cookie';
import {
  effect,
  signal,
  isSignal,
  type Signal,
  type ReadonlySignal,
  resolveSignalOrValue,
} from '@quilted/signals';

import type {BrowserDetails, CookieOptions, Cookies} from './types.ts';
import {decode} from './encoding.ts';

export class Browser implements BrowserDetails {
  readonly title = new BrowserTitle();
  readonly metas = new BrowserHeadElements('meta');
  readonly links = new BrowserHeadElements('link');
  readonly htmlAttributes = new BrowserElementAttributes(
    document.documentElement,
  );
  readonly bodyAttributes = new BrowserElementAttributes(document.body);
  readonly cookies = new BrowserCookies();
  readonly serializations = new BrowserSerializations();
  readonly request = new Request(window.location.href);
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

  constructor(readonly element: Element) {
    this.initialElements = Array.from(document.head.querySelectorAll(element));
  }

  add = (
    attributes:
      | Partial<HTMLElementTagNameMap[Element]>
      | ReadonlySignal<Partial<HTMLElementTagNameMap[Element]>>,
  ) => {
    const element = document.createElement(this.element);

    setAttributes(element, attributes);

    const existingElement = this.initialElements.find((existingElement) => {
      return element.isEqualNode(existingElement);
    });

    const resolvedElement = existingElement ?? element;

    if (!existingElement) {
      document.head.appendChild(resolvedElement);
    }

    let teardown: undefined | (() => void);

    if (isSignal(attributes)) {
      teardown = syncAttributesFromSignal(resolvedElement, attributes);
    }

    return () => {
      resolvedElement.remove();
      teardown?.();
    };
  };
}

export class BrowserElementAttributes<Element extends HTMLElement> {
  constructor(readonly element: Element) {}

  add(attributes: Partial<Element> | ReadonlySignal<Partial<Element>>) {
    const {element} = this;

    setAttributes(element, attributes);

    let teardown: undefined | (() => void);

    if (isSignal(attributes)) {
      teardown = syncAttributesFromSignal(element, attributes);
    }

    return () => {
      teardown?.();

      for (const attribute of Object.keys(resolveSignalOrValue(attributes))) {
        element.removeAttribute(attribute);
      }
    };
  }
}

export class BrowserSerializations {
  private readonly serializations = new Map<string, unknown>(
    Array.from(
      document.querySelectorAll<HTMLMetaElement>(`meta[name^="serialized:"]`),
    ).map((node) => [
      node.name.replace(/^serialized:/, ''),
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
    return value ? (decode(JSON.parse(value)) as T) : undefined;
  } catch {
    return undefined;
  }
}

function setAttributes(
  element: Element,
  attributes: Record<string, any> | ReadonlySignal<Record<string, any>>,
) {
  const resolvedAttributes = isSignal<Record<string, any>>(attributes)
    ? attributes.peek()
    : attributes;

  for (const [attribute, value] of Object.entries(resolvedAttributes)) {
    setAttribute(element, attribute, value);
  }
}

function setAttribute(element: Element, attribute: string, value: any) {
  if (attribute in element) {
    (element as any)[attribute] = value;
  } else {
    element.setAttribute(attribute, value);
  }
}

function syncAttributesFromSignal(
  element: Element,
  attributes: ReadonlySignal<Record<string, any>>,
) {
  let lastAttributesEntries: [string, any][];

  return effect(() => {
    const updatedAttributes = attributes.value;

    if (!lastAttributesEntries) return;

    const updatedAttributeEntries = Object.entries(updatedAttributes);
    const seenAttributes = new Set<string>();

    for (const [attribute, value] of updatedAttributeEntries) {
      seenAttributes.add(attribute);
      setAttribute(element, attribute, value);
    }

    for (const [attribute] of lastAttributesEntries) {
      if (!seenAttributes.has(attribute)) {
        setAttribute(element, attribute, undefined);
      }
    }

    lastAttributesEntries = updatedAttributeEntries;
  });
}
