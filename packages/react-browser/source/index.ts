export * from '@quilted/browser';

export {BrowserDetailsContext} from './context.ts';

export {useAlternateUrl} from './hooks/alternate-url.ts';
export {useBodyAttributes} from './hooks/body-attributes.ts';
export {useBrowserEffect} from './hooks/browser-effect.ts';
export {useCookie, useCookies} from './hooks/cookie.ts';
export {useFavicon} from './hooks/favicon.ts';
export {useHTMLAttributes} from './hooks/html-attributes.ts';
export {useInitialURL} from './hooks/initial-url.ts';
export {useLink} from './hooks/link.ts';
export {useLocale} from './hooks/locale.ts';
export {useMeta} from './hooks/meta.ts';
export {useThemeColor} from './hooks/theme-color.ts';
export {useTitle} from './hooks/title.ts';

export {Alternate} from './components/Alternate.tsx';
export {BodyAttributes} from './components/BodyAttributes.tsx';
export {HTMLAttributes} from './components/HTMLAttributes.tsx';
export {Link} from './components/Link.tsx';
export {Meta} from './components/Meta.tsx';
export {ThemeColor} from './components/ThemeColor.tsx';
export {Title} from './components/Title.tsx';
export {Favicon} from './components/Favicon.tsx';
