const SEEN = new Map<string, boolean>();

const OPTIONS: {
  base?: string;
} = {};

let SCRIPT_REL: string;

export function preload(dependencies: string[]) {
  if (dependencies.length === 0) return Promise.resolve();

  const scriptRel = resolveScriptRel();

  const promise = Promise.all(
    dependencies.map((dependency) => {
      const resolved = `${OPTIONS.base ?? '/'}${dependency}`;

      if (SEEN.has(resolved)) return;
      SEEN.set(resolved, true);

      const isCSS = resolved.endsWith('.css');

      if (document.querySelector(`link[href="${resolved}"]`) != null) {
        return;
      }

      const link = document.createElement('link');

      if (isCSS) {
        link.rel = 'stylesheet';
      } else {
        link.as = 'script';
        link.rel = scriptRel;
      }

      link.crossOrigin = '';
      link.href = resolved;
      document.head.appendChild(link);

      // We will only wait for CSS
      if (isCSS) {
        return new Promise<PreloadError | void>((resolve) => {
          link.addEventListener('load', () => resolve());
          link.addEventListener('error', (error) =>
            resolve(new PreloadError(resolved, {cause: error})),
          );
        });
      }
    }),
  );

  function handlePreloadError(error: PreloadError) {
    const event = new PreloadErrorEvent(error);
    window.dispatchEvent(event);

    if (!event.defaultPrevented) {
      throw error;
    }
  }

  return promise.then((results) => {
    for (const result of results) {
      if (result != null) {
        handlePreloadError(result);
      }
    }
  });
}

preload.configure = (options: typeof OPTIONS) => {
  Object.assign(OPTIONS, options);
};

export class PreloadError extends Error {
  constructor(
    public readonly source: string,
    {cause}: {cause?: unknown} = {},
  ) {
    super(`Unable to preload ${source}`, {cause});
  }
}

export class PreloadErrorEvent extends Event {
  constructor(public readonly error: PreloadError) {
    super('quilt:preload-error', {cancelable: true});
  }
}

function resolveScriptRel() {
  if (SCRIPT_REL == null) {
    if (typeof document === 'undefined') {
      SCRIPT_REL = 'preload';
    } else {
      const {relList} = document.createElement('link');

      SCRIPT_REL =
        relList && relList.supports && relList.supports('modulepreload')
          ? 'modulepreload'
          : 'preload';
    }
  }

  return SCRIPT_REL;
}
