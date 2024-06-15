import {Router} from './Router.ts';

export {Navigation} from './components/Navigation.tsx';

export class TestRouter extends Router {
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
