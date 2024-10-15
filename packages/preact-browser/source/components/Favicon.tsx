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
    }
  | {
      /**
       * A single emoji that will be used as the favicon.
       */
      emoji: string;
      blank?: never;
      source?: never;
      type?: never;
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
    };

/**
 * Adds a favicon to your website, using a `<link rel="icon">` tag.
 */
export function Favicon({blank, emoji, type, source}: Props) {
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
