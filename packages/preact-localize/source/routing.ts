export {LocalizedLink} from './routing/LocalizedLink.tsx';
// export {LocalizedRouting} from './routing/LocalizedRouting.tsx';
export {useRouteLocalization} from './routing/context.ts';
export {createRouteLocalization} from './routing/localization/by-locale.ts';
export {createRoutePathLocalization} from './routing/localization/by-path.ts';
export {createRouteSubdomainLocalization} from './routing/localization/by-subdomain.ts';
export type {
  RouteLocalization,
  ResolvedRouteLocalization,
  DefaultLocaleDefinition,
} from './routing/types.ts';
