export type FileOrModuleResolver<T> = (() => Promise<T>) | string;

export function createScriptUrl(script: FileOrModuleResolver<any>) {
  return typeof window === 'undefined' || typeof script !== 'string'
    ? undefined
    : new URL(script, window.location.href);
}

export function getSameOriginWorkerUrl(url: URL) {
  return url.origin === window.location.origin
    ? url
    : new URL(
        URL.createObjectURL(
          new Blob([`importScripts(${JSON.stringify(url.href)})`]),
        ),
      );
}
