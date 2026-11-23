import JSCookie from 'js-cookie';
import {
  effect,
  signal,
  isSignal,
  type Signal,
  type ReadonlySignal,
  resolveSignalOrValue,
} from '@quilted/signals';

import type {
  BrowserDetails,
  BrowserHeadElementAttributes,
  CookieOptions,
  Cookies,
} from './types.ts';
import {encode, decode} from './encoding.ts';

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
  readonly locale: BrowserDetails['locale'];
  readonly request = new Request(window.location.href);

  constructor({locale = navigator.language}: {locale?: string} = {}) {
    this.locale = {value: locale};
  }
}

export class BrowserCookies implements Cookies {
  readonly #allowsCookies: boolean;
  readonly #cookieSignals: Signal<Map<string, Signal<string>>>;

  constructor() {
    let allowsCookies = true;
    let initialCookies: Record<string, string> | undefined;

    try {
      initialCookies = JSCookie.get();
    } catch {
      allowsCookies = false;
      initialCookies = {};
    }

    this.#allowsCookies = allowsCookies;

    this.#cookieSignals = signal(
      new Map<string, Signal<string>>(
        Object.entries(initialCookies).map(([cookie, value]) => [
          cookie,
          signal(value),
        ]),
      ),
    );
  }

  has(cookie: string) {
    return this.#cookieSignals.value.get(cookie)?.value != null;
  }

  get(cookie: string) {
    return this.#cookieSignals.value.get(cookie)?.value;
  }

  set(cookie: string, value: string, options?: CookieOptions) {
    this.#checkCookies();
    JSCookie.set(cookie, value, options);
    this.#updateCookie(cookie);
  }

  delete(cookie: string, options?: CookieOptions) {
    this.#checkCookies();
    JSCookie.remove(cookie, options);
    this.#updateCookie(cookie);
  }

  *entries() {
    const cookies = this.#cookieSignals.peek();

    for (const [cookie, signal] of cookies) {
      yield [cookie, signal.peek()] as const;
    }
  }

  *[Symbol.iterator]() {
    yield* this.#cookieSignals.peek().keys();
  }

  #checkCookies() {
    if (this.#allowsCookies) return;

    throw new BrowserCookiesUnavailableError();
  }

  #updateCookie(cookie: string) {
    const value = JSCookie.get(cookie);
    const cookieSignals = this.#cookieSignals.peek();
    const cookieSignal = cookieSignals.get(cookie);

    if (value) {
      if (cookieSignal) {
        cookieSignal.value = value;
      } else {
        const newCookie = signal(value);
        const newCookies = new Map(cookieSignals);
        newCookies.set(cookie, newCookie);
        this.#cookieSignals.value = newCookies;
      }
    } else if (cookieSignal) {
      const newCookies = new Map(cookieSignals);
      newCookies.delete(cookie);
      this.#cookieSignals.value = newCookies;
    }
  }
}

export class BrowserCookiesUnavailableError extends Error {
  name = 'BrowserCookiesUnavailableError';

  constructor() {
    super('Cookies are not available in this environment');
  }
}

export class BrowserTitle {
  #titleElement = document.head.querySelector('title');
  #titleValues = signal<Signal<string>[]>([]);

  add = (title: string | ReadonlySignal<string>) => {
    const titleSignal = isSignal(title) ? title : signal(title);
    const newTitleValues = [...this.#titleValues.peek(), titleSignal];
    this.#titleValues.value = newTitleValues;
    return () => {
      this.#titleValues.value = this.#titleValues.value.filter(
        (existingTitle) => existingTitle !== titleSignal,
      );
    };
  };

  constructor() {
    effect(() => {
      const title = this.#titleValues.value.at(-1)?.value;
      if (title == null) return;

      if (this.#titleElement) {
        this.#titleElement.textContent = title;
      } else {
        this.#titleElement = document.createElement('title');
        this.#titleElement.textContent = title;
        document.head.appendChild(this.#titleElement);
      }
    });
  }
}

export class BrowserHeadElements<Element extends keyof HTMLElementTagNameMap> {
  /**
   * Elements of this kind that were already in the `<head>` when this instance
   * was created (typically, server-rendered), and that no `add()` call has
   * adopted yet.
   */
  #initialElements: HTMLElementTagNameMap[Element][];

  /**
   * The “kinds” of element (see `headElementKind()`) that have been added
   * through this instance. Only unadopted initial elements of these kinds are
   * ever removed by this instance.
   */
  #addedKinds = new Set<string>();
  #settleState: 'pending' | 'scheduled' | 'settled' = 'pending';

  constructor(readonly element: Element) {
    this.#initialElements = Array.from(document.head.querySelectorAll(element));
  }

  add = (
    attributes:
      | BrowserHeadElementAttributes<Element>
      | ReadonlySignal<BrowserHeadElementAttributes<Element>>,
  ) => {
    const initialAttributes: Record<string, any> = isSignal(attributes)
      ? attributes.peek()
      : attributes;

    const element = document.createElement(this.element);

    setAttributes(element, initialAttributes);

    const existingIndex = this.#initialElements.findIndex((existingElement) => {
      return element.isEqualNode(existingElement);
    });

    // Each server-rendered element can be adopted once. The teardown below
    // removes it from the document, so a later `add()` with the same attributes
    // (a signal that goes A → B → A, or a second caller) must append a fresh
    // element instead of re-adopting a detached one.
    const existingElement =
      existingIndex === -1
        ? undefined
        : this.#initialElements.splice(existingIndex, 1)[0];

    let currentElement: globalThis.Element = existingElement ?? element;

    if (!existingElement) {
      document.head.appendChild(currentElement);
    }

    this.#trackAddedKind(element);

    let teardown: undefined | (() => void);

    if (isSignal(attributes)) {
      teardown = syncAttributesFromSignal(currentElement, attributes, {
        initial: initialAttributes,
        onReplace(replacement) {
          currentElement = replacement;
        },
      });
    }

    return () => {
      teardown?.();
      currentElement.remove();
    };
  };

  #trackAddedKind(element: globalThis.Element) {
    const kind = headElementKind(element);

    if (kind) this.#addedKinds.add(kind);

    switch (this.#settleState) {
      case 'pending': {
        // Server-rendered elements are adopted by `add()` calls made during
        // the first client render. In Preact (and React), all the effects of a
        // render are flushed synchronously together, so by the time a microtask
        // queued by the first `add()` runs, every element rendered by that
        // first pass has had its chance to adopt a matching initial element.
        this.#settleState = 'scheduled';
        queueMicrotask(() => this.#settle());
        break;
      }
      case 'settled': {
        if (kind) this.#removeUnadoptedInitialElements(kind);
        break;
      }
    }
  }

  #settle() {
    this.#settleState = 'settled';

    for (const kind of this.#addedKinds) {
      this.#removeUnadoptedInitialElements(kind);
    }
  }

  /**
   * Removes server-rendered elements that nothing on the client adopted, but
   * only those whose kind (for example, `<link rel="icon">` or
   * `<meta name="theme-color">`) the client now manages. Without this, a
   * server-rendered favicon that differs from the one the client renders stays
   * in the `<head>` forever, and some browsers keep showing it.
   */
  #removeUnadoptedInitialElements(kind: string) {
    this.#initialElements = this.#initialElements.filter((element) => {
      if (headElementKind(element) !== kind) return true;
      element.remove();
      return false;
    });
  }
}

/**
 * `<link rel>` values whose elements load resources the page depends on
 * (styles, scripts, connection hints). These are often written into the
 * `<head>` by the asset pipeline rather than through `browser.links`, so they
 * are never removed for being “unadopted”.
 */
const RESOURCE_LINK_RELS = new Set([
  'stylesheet',
  'preload',
  'modulepreload',
  'prefetch',
  'preconnect',
  'dns-prefetch',
  'prerender',
]);

/**
 * A key identifying which “slot” in the `<head>` an element fills, used to
 * decide which server-rendered elements a client-side `add()` supersedes. Links
 * are keyed by `rel` (ignoring the legacy `shortcut` token), metas by `name`,
 * `property` or `http-equiv`. Elements without a meaningful key return
 * `undefined` and are never cleaned up.
 */
function headElementKind(element: globalThis.Element): string | undefined {
  switch (element.localName) {
    case 'link': {
      const rels = (element.getAttribute('rel') ?? '')
        .toLowerCase()
        .split(/\s+/)
        .filter((rel) => rel && rel !== 'shortcut');

      if (rels.length === 0) return undefined;
      if (rels.some((rel) => RESOURCE_LINK_RELS.has(rel))) return undefined;

      return `link:rel:${rels.sort().join(' ')}`;
    }
    case 'meta': {
      for (const attribute of ['name', 'property', 'http-equiv']) {
        const value = element.getAttribute(attribute);
        if (value) return `meta:${attribute}:${value.toLowerCase()}`;
      }

      return undefined;
    }
  }

  return undefined;
}

/**
 * WebKit only reads these elements when they are inserted into the document;
 * it ignores in-place attribute changes. To make an update take effect, we
 * replace the element with a fresh one instead of mutating it.
 */
function requiresReplacementOnChange(element: globalThis.Element) {
  switch (element.localName) {
    case 'link': {
      const rels = (element.getAttribute('rel') ?? '')
        .toLowerCase()
        .split(/\s+/);
      return (
        rels.includes('icon') ||
        rels.includes('apple-touch-icon') ||
        rels.includes('apple-touch-icon-precomposed')
      );
    }
    case 'meta': {
      return element.getAttribute('name')?.toLowerCase() === 'theme-color';
    }
  }

  return false;
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
        removeAttribute(element, attribute);
      }
    };
  }
}

// Make this module execute in non-DOM environments
const HTMLElement: typeof globalThis.HTMLElement =
  typeof globalThis.HTMLElement === 'function'
    ? globalThis.HTMLElement
    : (class HTMLElement {} as any);

const DEFAULT_SERIALIZATION_ELEMENT_NAME = 'browser-serialization';

// SSR now writes serializations as `<script type="quilt/serialization" data-name=…>JSON</script>`
// instead of as `<browser-serialization>` custom elements. The script form is
// parser-safe in `<head>` (where the default `HTMLTemplate` now puts these),
// and avoids a Safari quirk where unknown body elements ahead of the first
// `<link rel=stylesheet>` can flash unstyled content even with
// `blocking="render"`. The legacy `BrowserSerializationElement` class below
// keeps working for anyone who still defines it programmatically.
const SERIALIZATION_SCRIPT_SELECTOR = 'script[type="quilt/serialization"]';

export class BrowserSerializationElement<T = unknown> extends HTMLElement {
  static define(name: string = DEFAULT_SERIALIZATION_ELEMENT_NAME) {
    customElements.define(name, this);
  }

  get name(): string | undefined {
    return this.getAttribute('name') ?? undefined;
  }

  set name(value: string | undefined) {
    if (value) {
      this.setAttribute('name', value);
    } else {
      this.removeAttribute('name');
    }
  }

  get data() {
    return getSerializedFromNode<T>(this) as T;
  }

  set data(value: T) {
    this.setAttribute('content', JSON.stringify(encode(value)));
  }
}

export class BrowserSerializations {
  readonly #serializations = new Map<string, unknown>(
    getSerializationsFromDocument(),
  );
  #serializationResolvers = new Map<string, Set<(data: any) => void>>();
  #teardownMutationObserver: (() => void) | undefined;

  get<T = unknown>(id: string) {
    return this.#serializations.get(id) as T;
  }

  set(id: string, data: unknown) {
    if (data === undefined) {
      this.#serializations.delete(id);
    } else {
      this.#serializations.set(id, data);

      if (this.#serializationResolvers.has(id)) {
        for (const resolve of this.#serializationResolvers.get(id) ?? []) {
          resolve(data);
        }

        this.#serializationResolvers.delete(id);
        if (this.#serializationResolvers.size === 0) {
          this.#teardownMutationObserver?.();
        }
      }
    }
  }

  delete(id: string) {
    this.#serializations.delete(id);
  }

  update(
    entries: Iterable<[string, unknown]> = getSerializationsFromDocument(),
  ) {
    for (const [id, data] of entries) {
      this.set(id, data);
    }
  }

  waitFor<T = unknown>(id: string): Promise<T> {
    if (this.#serializations.has(id)) {
      return Promise.resolve(this.get<T>(id));
    }

    return new Promise<T>((resolve) => {
      this.#addResolver<T>(id, resolve);
    });
  }

  *[Symbol.iterator]() {
    yield* this.#serializations;
  }

  #addResolver<T = unknown>(id: string, resolver: (data: T) => void) {
    const needsToStart = this.#serializationResolvers == null;
    const resolvers = this.#serializationResolvers.get(id) ?? new Set();
    resolvers.add(resolver);
    this.#serializationResolvers.set(id, resolvers);

    if (needsToStart) {
      const mutationObserver = new MutationObserver((mutations) => {
        const updates = new Map<string, unknown>();

        for (const mutation of mutations) {
          if (mutation.type === 'childList') {
            for (const node of mutation.addedNodes) {
              if (node.nodeType === Node.ELEMENT_NODE) {
                for (const serialization of (node as Element).querySelectorAll(
                  SERIALIZATION_SCRIPT_SELECTOR,
                )) {
                  updates.set(...serializationEntryFromNode(serialization));
                }
              }
            }
          }
        }

        this.update(updates);
      });

      this.#teardownMutationObserver = () => {
        mutationObserver.disconnect();
        this.#teardownMutationObserver = undefined;
      };

      mutationObserver.observe(document.documentElement, {
        childList: true,
        subtree: true,
      });
    }
  }
}

function getSerializationsFromDocument() {
  return Array.from(
    document.querySelectorAll<HTMLElement>(SERIALIZATION_SCRIPT_SELECTOR),
  ).map(serializationEntryFromNode);
}

function serializationEntryFromNode<T = unknown>(node: Element): [string, T] {
  // Script form carries the name on `data-name` and the payload as text content;
  // fall back to the legacy `name` / `content` attributes so a
  // `<browser-serialization>` (e.g. produced by `BrowserSerializationElement`)
  // still parses correctly.
  const name =
    node.getAttribute('data-name') ?? node.getAttribute('name') ?? '_default';
  return [name, getSerializedFromNode(node) as any];
}

function getSerializedFromNode<T = unknown>(node: Element): T | undefined {
  const value =
    node.tagName === 'SCRIPT' ? node.textContent : node.getAttribute('content');

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
    if (value == null) continue;
    setAttribute(element, attribute, value);
  }
}

function setAttribute(element: Element, attribute: string, value: any) {
  if (attribute in element && !isTokenList((element as any)[attribute])) {
    (element as any)[attribute] = value;
  } else {
    element.setAttribute(attributeName(attribute), String(value));
  }
}

function removeAttribute(element: Element, attribute: string) {
  element.removeAttribute(attributeName(attribute));
}

// Token list properties (like `link.sizes`) can be assigned a string in modern
// browsers, but not in every DOM implementation, so we write them through
// their content attribute instead.
function isTokenList(value: unknown) {
  return typeof DOMTokenList === 'function' && value instanceof DOMTokenList;
}

const PROPERTY_TO_ATTRIBUTE_NAME = new Map([
  ['className', 'class'],
  ['htmlFor', 'for'],
  ['httpEquiv', 'http-equiv'],
  ['acceptCharset', 'accept-charset'],
]);

function attributeName(attribute: string) {
  return PROPERTY_TO_ATTRIBUTE_NAME.get(attribute) ?? attribute.toLowerCase();
}

function syncAttributesFromSignal(
  element: Element,
  attributes: ReadonlySignal<Record<string, any>>,
  {
    initial = attributes.peek(),
    onReplace,
  }: {
    /**
     * The attributes the element was created with.
     */
    initial?: Record<string, any>;
    /**
     * When provided, elements that browsers only read on insertion (see
     * `requiresReplacementOnChange()`) are replaced with a fresh element when
     * their attributes change, instead of being updated in place. This
     * callback receives the new element.
     */
    onReplace?(element: Element): void;
  } = {},
) {
  let currentElement = element;
  let lastAttributes = initial;

  return effect(() => {
    const updatedAttributes = attributes.value;
    const previousAttributes = lastAttributes;
    lastAttributes = updatedAttributes;

    const changed: [string, any][] = [];
    const removed: string[] = [];

    for (const [attribute, value] of Object.entries(updatedAttributes)) {
      if (value == null) continue;
      if (!Object.is(previousAttributes[attribute], value)) {
        changed.push([attribute, value]);
      }
    }

    for (const [attribute, value] of Object.entries(previousAttributes)) {
      if (value != null && updatedAttributes[attribute] == null) {
        removed.push(attribute);
      }
    }

    if (changed.length === 0 && removed.length === 0) return;

    if (onReplace) {
      const replacement = currentElement.ownerDocument.createElement(
        currentElement.localName,
      );
      setAttributes(replacement, updatedAttributes);

      if (
        requiresReplacementOnChange(currentElement) ||
        requiresReplacementOnChange(replacement)
      ) {
        // Remove, then insert a fresh element in the same position, so that
        // the browser processes it as a new element.
        const parent = currentElement.parentNode;
        const nextSibling = currentElement.nextSibling;
        currentElement.remove();
        parent?.insertBefore(replacement, nextSibling);

        currentElement = replacement;
        onReplace(replacement);
        return;
      }
    }

    for (const [attribute, value] of changed) {
      setAttribute(currentElement, attribute, value);
    }

    for (const attribute of removed) {
      removeAttribute(currentElement, attribute);
    }
  });
}
