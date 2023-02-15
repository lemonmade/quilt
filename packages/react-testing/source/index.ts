// @see https://reactjs.org/blog/2022/03/08/react-18-upgrade-guide.html#configuring-your-testing-environment
Reflect.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', {value: true});

export * from './implementations/test-renderer';
export * from './types';
export {createEnvironment} from './environment';
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
} from './environment';
