import {useFavicon} from '../hooks';

export type Props =
  | {
      source: string;
      type?: string;
      empty?: never;
      favicon?: never;
    }
  | {favicon: string; empty?: never; source?: never; type?: never}
  | {empty: true; favicon?: never; source?: never; type?: never};

export function Favicon({empty, favicon, type, source}: Props) {
  let resolvedSource: string;

  if (empty) {
    resolvedSource = 'data:image';
  } else if (favicon) {
    // Hat tip: https://twitter.com/LeaVerou/status/1241619866475474946
    resolvedSource = `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='0.9em' font-size='90'>${favicon}</text></svg>`;
  } else {
    resolvedSource = source!;
  }

  useFavicon(resolvedSource, {type});
}
