import type {HTMLProps, HtmlHTMLAttributes} from 'react';
import type {ServerActionKind} from '@quilted/react-server-render';

import {getSerializationsFromDocument} from './utilities/serialization.ts';

export interface State {
  title?: string;
  metas: HTMLProps<HTMLMetaElement>[];
  links: HTMLProps<HTMLLinkElement>[];
  scripts: HTMLProps<HTMLScriptElement>[];
  bodyAttributes: HTMLProps<HTMLBodyElement>;
  htmlAttributes: HtmlHTMLAttributes<HTMLHtmlElement>;
  serializations: Map<string, unknown>;
}

interface Subscription {
  (state: State): void;
}

export const SERVER_ACTION_KIND = Symbol('serverActionKind');
export const SERVER_ACTION_ID = Symbol('html');
const DEFAULT_HYDRATION_ID = Symbol('defaultId');
const DEFAULT_HYDRATION_PREFIX = 'hydration';

interface Ref<T> {
  current: T;
}

export class HTMLManager {
  private scripts: Ref<HTMLProps<HTMLScriptElement>>[] = [];
  private htmlAttributes: Ref<HtmlHTMLAttributes<HTMLHtmlElement>>[] = [];
  private bodyAttributes: Ref<HTMLProps<HTMLBodyElement>>[] = [];

  addScript(script: HTMLProps<HTMLScriptElement>) {
    return this.addDescriptor(script, this.scripts);
  }

  addAttributes(attributes: HtmlHTMLAttributes<HTMLHtmlElement>) {
    return this.addDescriptor(attributes, this.htmlAttributes);
  }

  addBodyAttributes(attributes: HTMLProps<HTMLBodyElement>) {
    return this.addDescriptor(attributes, this.bodyAttributes);
  }
}
