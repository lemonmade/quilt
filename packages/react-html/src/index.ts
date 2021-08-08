export type {Serializable} from './types';

export {
  Alternate,
  BodyAttributes,
  Favicon,
  HtmlAttributes,
  Hydrator,
  Link,
  Meta,
  SearchRobots,
  ThemeColor,
  Title,
  Viewport,
} from './components';

export {
  useAlternateUrl,
  useBodyAttributes,
  useFavicon,
  useHtmlAttributes,
  useHtmlUpdater,
  useLink,
  useLocale,
  useMeta,
  useSearchRobots,
  useSerialized,
  useThemeColor,
  useTitle,
  useViewport,
} from './hooks';

export {getSerialized} from './utilities/serialization';
