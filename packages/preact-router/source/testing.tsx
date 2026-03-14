import {Navigation} from './Navigation.ts';

export {Navigation};

export class TestNavigation extends Navigation {
  go() {}

  back() {}

  forward() {}

  navigate = () => {
    return this.currentRequest;
  };

  // block() {
  //   return () => {};
  // }

  // resolve(to: NavigateTo) {
  //   const url = resolveUrl(to, this.currentUrl);
  //   return {url, external: this.#isExternal(url, this.currentUrl)};
  // }
}
