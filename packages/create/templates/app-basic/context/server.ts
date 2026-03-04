import type {AppContext} from './types.ts';
import {NavigationForApp} from './navigation.ts';

export class ServerAppContext implements AppContext {
  readonly navigation: NavigationForApp;

  constructor(request: Request) {
    this.navigation = new NavigationForApp(request.url);
  }
}
