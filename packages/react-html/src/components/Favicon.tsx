import {useFavicon} from '../hooks';

export type Props =
  | {
      source: string;
      type?: string;
      empty?: never;
      emoji?: never;
    }
  | {emoji: string; empty?: never; source?: never; type?: never}
  | {empty: true; emoji?: never; source?: never; type?: never};

export function Favicon({empty, emoji, type, source}: Props) {
  let resolvedSource: string;

  if (empty) {
    resolvedSource = 'data:image';
  } else if (emoji) {
    // Hat tip: https://twitter.com/LeaVerou/status/1241619866475474946
    resolvedSource = `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='0.9em' font-size='90'>${emoji}</text></svg>`;
  } else {
    resolvedSource = source!;
  }

  useFavicon(resolvedSource, {type});

  return null;
}
