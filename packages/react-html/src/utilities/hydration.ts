export const HYDRATION_ATTRIBUTE = 'data-hydration-id';

export function getHydrationsFromDocument() {
  const hydrations = new Map<string, string>();

  if (typeof document !== 'undefined') {
    for (const element of document.querySelectorAll(
      `[${HYDRATION_ATTRIBUTE}]`,
    )) {
      hydrations.set(
        element.getAttribute(HYDRATION_ATTRIBUTE)!,
        element.innerHTML,
      );
    }
  }

  return hydrations;
}
