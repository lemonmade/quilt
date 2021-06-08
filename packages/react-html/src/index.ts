export {
  Script,
  Style,
  Hydrator,
  Meta,
  Title,
  Viewport,
  Favicon,
} from './components';

export {
  useSerialized,
  useBodyAttributes,
  useHtmlAttributes,
  useFavicon,
  useLink,
  useLocale,
  useMeta,
  useTitle,
  usePreconnect,
  useHtmlUpdater,
  useViewport,
} from './hooks';

// TODO: export component versions of most of those hooks

export {getSerialized} from './utilities/serialization';
