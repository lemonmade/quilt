import {HTMLProps, HtmlHTMLAttributes} from 'react';
import {ServerRenderEffectKind} from '@quilted/react-server-render';

import {
  getHydrationsFromDocument,
  getSerializationsFromDocument,
} from './utilities';

export interface State {
  title?: string;
  metas: HTMLProps<HTMLMetaElement>[];
  links: HTMLProps<HTMLLinkElement>[];
  bodyAttributes: HTMLProps<HTMLBodyElement>;
  htmlAttributes: HtmlHTMLAttributes<HTMLHtmlElement>;
}

interface Subscription {
  (state: State): void;
}

export const EFFECT = Symbol('effect');
export const SERVER_RENDER_EFFECT_ID = Symbol('html');
const DEFAULT_HYDRATION_ID = Symbol('defaultId');
const DEFAULT_HYDRATION_PREFIX = 'hydration';

interface Ref<T> {
  current: T;
}

export class HtmlManager {
  readonly [EFFECT]: ServerRenderEffectKind = {
    id: SERVER_RENDER_EFFECT_ID,
    betweenEachPass: () => this.reset(),
  };

  private serializations = getSerializationsFromDocument();
  private hydrations = getHydrationsFromDocument();
  private hydrationIds = new Map<
    string | typeof DEFAULT_HYDRATION_ID,
    number
  >();

  private titles: Ref<string>[] = [];
  private metas: Ref<HTMLProps<HTMLMetaElement>>[] = [];
  private links: Ref<HTMLProps<HTMLLinkElement>>[] = [];
  private htmlAttributes: Ref<HtmlHTMLAttributes<HTMLHtmlElement>>[] = [];
  private bodyAttributes: Ref<HTMLProps<HTMLBodyElement>>[] = [];
  private subscriptions = new Set<Subscription>();

  get state(): State {
    const lastTitle = this.titles[this.titles.length - 1];

    return {
      title: lastTitle?.current,
      metas: this.metas.map(({current}) => current),
      links: this.links.map(({current}) => current),
      bodyAttributes: Object.assign(
        {},
        ...this.bodyAttributes.map(({current}) => current),
      ),
      htmlAttributes: Object.assign(
        {},
        ...this.htmlAttributes.map(({current}) => current),
      ),
    };
  }

  reset({includeSerializations = false} = {}) {
    this.titles = [];
    this.metas = [];
    this.links = [];
    this.subscriptions.clear();
    this.hydrationIds.clear();

    if (includeSerializations) {
      this.serializations.clear();
      this.hydrations.clear();
    }
  }

  subscribe(subscription: Subscription) {
    this.subscriptions.add(subscription);
    return () => {
      this.subscriptions.delete(subscription);
    };
  }

  addTitle(title: string) {
    return this.addDescriptor(title, this.titles);
  }

  addMeta(meta: HTMLProps<HTMLMetaElement>) {
    return this.addDescriptor(meta, this.metas);
  }

  addLink(link: HTMLProps<HTMLLinkElement>) {
    return this.addDescriptor(link, this.links);
  }

  addHtmlAttributes(attributes: HtmlHTMLAttributes<HTMLHtmlElement>) {
    return this.addDescriptor(attributes, this.htmlAttributes);
  }

  addBodyAttributes(attributes: HTMLProps<HTMLBodyElement>) {
    return this.addDescriptor(attributes, this.bodyAttributes);
  }

  setSerialization(id: string, data: unknown) {
    this.serializations.set(id, data);
  }

  getSerialization<T>(id: string): T | undefined {
    return this.serializations.get(id) as T | undefined;
  }

  hydrationId(id?: string) {
    const finalId = id ?? DEFAULT_HYDRATION_ID;
    const current = this.hydrationIds.get(finalId) ?? 0;
    this.hydrationIds.set(finalId, current + 1);
    return `${id ?? DEFAULT_HYDRATION_PREFIX}${current + 1}`;
  }

  getHydration(id: string) {
    return this.hydrations.get(id);
  }

  extract() {
    return {
      ...this.state,
      serializations: [...this.serializations.entries()].map(([id, data]) => ({
        id,
        data,
      })),
    };
  }

  private addDescriptor<T>(item: T, list: Ref<T>[]) {
    const ref = {current: item};
    list.push(ref);
    this.updateSubscriptions();

    return {
      update: (updated: T) => {
        ref.current = updated;
        this.updateSubscriptions();
      },
      remove: () => {
        const index = list.indexOf(ref);
        if (index >= 0) {
          list.splice(index, 1);
          this.updateSubscriptions();
        }
      },
    };
  }

  private updateSubscriptions() {
    const {state} = this;

    for (const subscription of this.subscriptions) {
      subscription(state);
    }
  }
}
