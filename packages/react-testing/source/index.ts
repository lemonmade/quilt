// @see https://reactjs.org/blog/2022/03/08/react-18-upgrade-guide.html#configuring-your-testing-environment
Reflect.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', {value: true});

export * from './implementations/test-renderer.ts';
export * from './types.ts';
export {createEnvironment} from './environment.tsx';
export type {
  CustomRender,
  CustomRenderResult,
  CustomRenderOptions,
  CustomRenderExtendOptions,
  HookRunner,
  Environment,
  EnvironmentOptions,
  ContextOption,
  RenderOption,
  ActionsOption,
} from './environment.tsx';
