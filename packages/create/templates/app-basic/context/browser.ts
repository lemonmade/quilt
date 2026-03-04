import type {AppContext} from './types.ts';
import {NavigationForApp} from './navigation.ts';

export class BrowserAppContext implements AppContext {
  readonly navigation: NavigationForApp;

  constructor() {
    this.navigation = new NavigationForApp();
  }
}
