import {useBrowserEffectsAreActive} from '../../context.ts';
import {useResponseSerialization} from '../hooks/serialization.ts';

/**
 * Sets a serialization for the HTML response. This value can then be read on the client
 * using the `useSerialized()` hook.
 */
export function Serialization({
  name,
  content,
}: {
  name: string;
  content: unknown;
}) {
  if (!useBrowserEffectsAreActive()) {
    return (
      // @ts-expect-error a custom element that I don’t want to define,
      <browser-serialization name={name} content={JSON.stringify(content)} />
    );
  }

  if (typeof document === 'object') return null;

  useResponseSerialization(name, content);
  return null;
}
