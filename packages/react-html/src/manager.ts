import {HTMLProps, HtmlHTMLAttributes} from 'react';
import {ServerRenderEffectKind} from '@quilted/react-server-render';

import {getSerializationsFromDocument} from './utilities';

interface Title {
  title: string;
}

interface State {
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

export class HtmlManager {
  readonly [EFFECT]: ServerRenderEffectKind = {
    id: SERVER_RENDER_EFFECT_ID,
    betweenEachPass: () => this.reset(),
  };

  private serializations = getSerializationsFromDocument();
  private titles: Title[] = [];
  private metas: HTMLProps<HTMLMetaElement>[] = [];
  private links: HTMLProps<HTMLLinkElement>[] = [];
  private htmlAttributes: HtmlHTMLAttributes<HTMLHtmlElement>[] = [];
  private bodyAttributes: HTMLProps<HTMLBodyElement>[] = [];
  private subscriptions = new Set<Subscription>();

  get state(): State {
    const lastTitle = this.titles[this.titles.length - 1];

    return {
      title: lastTitle && lastTitle.title,
      metas: this.metas,
      links: this.links,
      bodyAttributes: Object.assign({}, ...this.bodyAttributes),
      htmlAttributes: Object.assign({}, ...this.htmlAttributes),
    };
  }

  reset({includeSerializations = false} = {}) {
    this.titles = [];
    this.metas = [];
    this.links = [];
    this.subscriptions.clear();

    if (includeSerializations) {
      this.serializations.clear();
    }
  }

  subscribe(subscription: Subscription) {
    this.subscriptions.add(subscription);
    return () => {
      this.subscriptions.delete(subscription);
    };
  }

  addTitle(title: string) {
    return this.addDescriptor({title}, this.titles);
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

  extract() {
    return {
      ...this.state,
      serializations: [...this.serializations.entries()].map(([id, data]) => ({
        id,
        data,
      })),
    };
  }

  private addDescriptor<T>(item: T, list: T[]) {
    list.push(item);
    this.updateSubscriptions();

    return () => {
      const index = list.indexOf(item);
      if (index >= 0) {
        list.splice(index, 1);
        this.updateSubscriptions();
      }
    };
  }

  private updateSubscriptions() {
    for (const subscription of this.subscriptions) {
      subscription(this.state);
    }
  }
}
