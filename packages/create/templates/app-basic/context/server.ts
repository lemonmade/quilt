import {Navigation} from '@quilted/quilt/navigation';
import {Localization, parseAcceptLanguageHeader} from '@quilted/quilt/localize';

import type {AppContext} from './types.ts';

export class ServerAppContext implements AppContext {
  readonly navigation: Navigation;
  readonly localization: Localization;

  constructor(request: Request) {
    this.navigation = new Navigation(request.url);
    this.localization = new Localization(
      parseAcceptLanguageHeader(request.headers.get('Accept-Language') ?? '') ?? 'en',
    );
  }
}
