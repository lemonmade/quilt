import {Navigation} from '@quilted/quilt/navigation';
import {Localization} from '@quilted/quilt/localize';

import type {AppContext} from './types.ts';

export class BrowserAppContext implements AppContext {
  readonly navigation: Navigation;
  readonly localization: Localization;

  constructor() {
    this.navigation = new Navigation();
    this.localization = new Localization(navigator.language);
  }
}
