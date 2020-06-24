export const SERIALIZE_ID_ATTRIBUTE = 'data-serialized-id';
export const SERIALIZE_VALUE_ATTRIBUTE = 'data-serialized-value';
export const MANAGED_ATTRIBUTE = 'data-react-html';

export function getSerializationsFromDocument() {
  const serializations = new Map<string, unknown>();

  if (typeof document === 'undefined') {
    return serializations;
  }

  for (const node of document.querySelectorAll(`[${SERIALIZE_ID_ATTRIBUTE}]`)) {
    serializations.set(
      node.getAttribute(SERIALIZE_ID_ATTRIBUTE)!,
      getSerializedFromNode(node),
    );
  }

  return serializations;
}

function getSerializedFromNode<Data>(node: Element): Data | undefined {
  const value = node.getAttribute(SERIALIZE_VALUE_ATTRIBUTE);

  try {
    return value ? JSON.parse(value) : undefined;
  } catch {
    return undefined;
  }
}

export function getSerialized<Data>(id: string) {
  const node = document.querySelector(`[${SERIALIZE_ID_ATTRIBUTE}="${id}"]`);

  if (node == null) {
    return undefined;
  }

  return getSerializedFromNode<Data>(node);
}
