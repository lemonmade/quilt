import type {ReadonlySignal} from '@quilted/signals';
import {resolveSignalOrValue} from '@quilted/signals';

import {
  useFavicons,
  faviconLinkAttributes,
  type FaviconIcon,
} from '../hooks/favicon.ts';
import {useBrowserEffectsAreActive} from '../context.ts';

import {Link} from './Link.tsx';

export type Props =
  | {
      /**
       * A URI for the favicon. This will be used directly for the underling `<link>` tag.
       */
      source: string;
      /**
       * The image MIME type, which will be used as the `type` attribute on the
       * underlying `<link>` tag.
       */
      type?: string;
      blank?: never;
      emoji?: never;
      icons?: never;
    }
  | {
      /**
       * A single emoji that will be used as the favicon.
       */
      emoji: string;
      blank?: never;
      source?: never;
      type?: never;
      icons?: never;
    }
  | {
      /**
       * Sets the favicon to be completely blank, which prevents the browser from
       * requesting a `/favicon.ico` file from your server.
       */
      blank: true;
      emoji?: never;
      source?: never;
      type?: never;
      icons?: never;
    }
  | {
      /**
       * The complete set of icons for the page, such as several sizes of
       * favicon and an `apple-touch-icon`. This component owns all of these
       * `<link>` tags: when any icon changes, the whole set is removed and
       * re-inserted together, which is what browsers need to notice the change.
       *
       * You can pass a signal to update the icons without re-rendering.
       */
      icons: readonly FaviconIcon[] | ReadonlySignal<readonly FaviconIcon[]>;
      blank?: never;
      emoji?: never;
      source?: never;
      type?: never;
    };

export type {FaviconIcon};

/**
 * Adds a favicon to your website, using a `<link rel="icon">` tag. Pass `icons`
 * to manage a complete set of icon links (multiple sizes, `apple-touch-icon`)
 * together.
 */
export function Favicon({blank, emoji, type, source, icons}: Props) {
  if (icons) return <FaviconIcons icons={icons} />;

  let resolvedSource: string;

  if (blank) {
    resolvedSource = 'data:image';
  } else if (emoji) {
    // Hat tip: https://twitter.com/LeaVerou/status/1241619866475474946
    // This doesn’t work perfectly because of the way React escapes the attribute,
    // but most browsers handle it fine.
    resolvedSource = `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='0.9em' font-size='90'>${emoji}</text></svg>`;
  } else {
    resolvedSource = source!;
  }

  return <Link rel="icon" href={resolvedSource} type={type} />;
}

function FaviconIcons({
  icons,
}: {
  icons: readonly FaviconIcon[] | ReadonlySignal<readonly FaviconIcon[]>;
}) {
  if (!useBrowserEffectsAreActive()) {
    return (
      <>
        {resolveSignalOrValue(icons).map((icon) => (
          <link {...(faviconLinkAttributes(icon) as any)} />
        ))}
      </>
    );
  }

  useFavicons(icons);
  return null;
}
