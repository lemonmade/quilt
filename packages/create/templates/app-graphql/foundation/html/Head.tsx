import {Title, Favicon} from '@quilted/quilt/browser';
import {SearchRobots, Viewport} from '@quilted/quilt/server';

// This component sets default `<head>` details of the HTML page. If you need
// to customize any of these details based on conditions or application data, you
// can render these same components deeper in the application to override these defaults.
//
// @see https://github.com/lemonmade/quilt/blob/main/documentation/features/html.md
export function Head() {
  return (
    <>
      {/* Sets the default `<title>` for this application. */}
      <Title>App</Title>

      {/*
       * Sets the default favicon used by the application. You can
       * change this to a different emoji, make it `blank`, or pass
       * a URL with the `source` prop.
       */}
      <Favicon emoji="🧶" />

      {/* Adds a responsive-friendly `viewport` `<meta>` tag. */}
      <Viewport cover />

      {/*
       * Disables all search indexing for this application. If you are
       * building an unauthenticated app, you probably want to remove
       * this component, or update it to control how your site is indexed
       * by search engines.
       */}
      <SearchRobots index={false} follow={false} />
    </>
  );
}
