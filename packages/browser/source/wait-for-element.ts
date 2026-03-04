/**
 * Returns a promise that resolves with the first element matching `selector`.
 * If the element already exists in the DOM, resolves immediately. Otherwise,
 * uses a MutationObserver to wait for it to appear (necessary when the script
 * runs with `async` and the DOM may not be fully parsed yet).
 */
export function waitForElement<E extends Element = Element>(
  selector: string,
): Promise<E> {
  const existing = document.querySelector<E>(selector);
  if (existing) return Promise.resolve(existing);

  return new Promise<E>((resolve) => {
    const observer = new MutationObserver(() => {
      const element = document.querySelector<E>(selector);
      if (element) {
        observer.disconnect();
        resolve(element);
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  });
}
