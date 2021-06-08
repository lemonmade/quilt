import {useFavicon} from '../hooks';

export type Props =
  | {
      source: string;
      type?: string;
      empty?: never;
    }
  | {empty: true; source?: never; type?: never};

export function Favicon({empty, type, source}: Props) {
  let resolvedSource: string;

  if (empty) {
    resolvedSource = 'data:image';
  } else {
    resolvedSource = source!;
  }

  useFavicon(resolvedSource, {type});

  return null;
}
