declare module 'quilt:module/env' {
  import type {EnvironmentVariables} from '@quilted/quilt/env';

  export type {EnvironmentVariables};

  const Env: EnvironmentVariables;
  export default Env;
}

declare module 'quilt:module/app' {
  import type {ComponentType} from 'preact';

  const App: ComponentType<Record<string, unknown>>;
  export default App;
}

declare module 'quilt:module/hono' {
  import type {Hono} from 'hono';

  const app: Hono;
  export default app;
}

declare module 'quilt:module/assets' {
  import type {BrowserAssets as BrowserAssetsType} from '@quilted/assets';

  export const BrowserAssets: {
    new (): BrowserAssetsType;
  };
}
