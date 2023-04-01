import type {Serializable} from '../types.ts';

export function getSerializationsFromDocument() {
  const serializations = new Map<string, unknown>();

  if (typeof document === 'undefined') {
    return serializations;
  }

  for (const node of document.querySelectorAll(
    `meta[name^="serialized"]`,
  ) as Iterable<HTMLMetaElement>) {
    const id = node.name.replace(/^serialized-/, '');
    serializations.set(id, getSerializedFromNode(node));
  }

  return serializations;
}

function getSerializedFromNode<Data>(
  node: Element,
): Serializable<Data> | undefined {
  const value = (node as HTMLMetaElement).content;

  try {
    return value ? JSON.parse(value) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Attempts to read the serialization with the specified ID from the HTML
 * document. You should typically use the `useSerialized` hook from this
 * library instead of this function, but `getSerialized` can be useful if
 * you need to read a serialized value from outside of the React part
 * of your application.
 */
export function getSerialized<Data>(id: string) {
  const node = document.querySelector(`meta[name="serialized-${id}"]`);

  if (node == null) {
    return undefined;
  }

  return getSerializedFromNode<Data>(node);
}
