import * as path from 'path';

import type {Plugin, OutputChunk, OutputBundle} from 'rollup';
import {multiline} from '../shared/strings.ts';
import MagicString from 'magic-string';

const MODULE_PREFIX = 'quilt-async-module:';

export interface Options {
  preload?: boolean;
  baseURL?: string;
  moduleID?(details: {imported: string}): string;
}

export function asyncModules({
  preload = true,
  baseURL = '/assets/',
  moduleID: getModuleID = defaultModuleID,
}: Options = {}): Plugin {
  return {
    name: '@quilted/async',
    async resolveId(id, importer) {
      let prefix: string;

      if (id.startsWith(MODULE_PREFIX)) {
        prefix = MODULE_PREFIX;
      } else {
        return null;
      }

      const imported = id.replace(prefix, '');

      const resolved = await this.resolve(imported, importer, {
        skipSelf: true,
      });

      if (resolved == null) return null;

      return `\0${prefix}${resolved.id}`;
    },
    async load(id: string) {
      if (id.startsWith(`\0${MODULE_PREFIX}`)) {
        const imported = id.replace(`\0${MODULE_PREFIX}`, '');
        const moduleID = getModuleID({imported});

        const code = multiline`
          export default function resolveAsyncModule(load) {
            return {id: ${JSON.stringify(moduleID)}, import: load};
          }
        `;

        return {
          code,
          meta: {
            quilt: {module: imported, moduleID},
          },
        };
      }

      return null;
    },
    transform: baseURL
      ? (code) =>
          code.replace(/__QUILT_ASSETS_BASE_URL__/g, JSON.stringify(baseURL))
      : undefined,
    async generateBundle(options, bundle) {
      if (preload) {
        switch (options.format) {
          case 'es': {
            await preloadAsyncAssetsInESMBundle(bundle);
            break;
          }
          case 'system': {
            await preloadAsyncAssetsInSystemJSBundle(bundle);
            break;
          }
        }
      }
    },
  };
}

function defaultModuleID({imported}: {imported: string}) {
  return path.relative(process.cwd(), imported).replace(/[\\/]/g, '-');
}

async function preloadAsyncAssetsInESMBundle(bundle: OutputBundle) {
  const {parse: parseImports} = await import('es-module-lexer');

  for (const chunk of Object.values(bundle)) {
    if (chunk.type !== 'chunk') continue;
    if (chunk.dynamicImports.length === 0) continue;

    const {code} = chunk;
    const newCode = new MagicString(code);

    const imports = (await parseImports(code))[0];
    let hasReplacements = false;

    for (const imported of imports) {
      const {s: start, e: end, ss: importStart, d: dynamicStart} = imported;

      // es-module-lexer only sets `d >= 0` when the import is a dynamic one
      if (dynamicStart < 0) continue;

      // Get rid of the quotes
      const importSource = code.slice(start + 1, end - 1);

      const dependencies = getDependenciesForImport(
        importSource,
        chunk,
        bundle,
      );

      // The only dependency is the file itself, no need to preload
      if (dependencies.size === 1) continue;

      hasReplacements = true;
      const originalImport = code.slice(importStart, end + 1);
      newCode.overwrite(
        importStart,
        end + 1,
        preloadContentForDependencies(dependencies, originalImport),
      );
    }

    if (hasReplacements) {
      newCode.prepend(getPreloadHelperFunction() + '\n');
    }

    chunk.code = newCode.toString();
  }
}

async function preloadAsyncAssetsInSystemJSBundle(bundle: OutputBundle) {
  for (const chunk of Object.values(bundle)) {
    if (chunk.type !== 'chunk') continue;
    if (chunk.dynamicImports.length === 0) continue;

    const {code} = chunk;
    const newCode = new MagicString(code);

    const systemDynamicImportRegex = /\bmodule\.import\(([^)]*)\)/g;

    let match: RegExpExecArray | null;
    let hasReplacements = false;

    while ((match = systemDynamicImportRegex.exec(code))) {
      const [originalImport, imported] = match;

      // Get rid of surrounding space and quotes
      const importSource = imported!.trim().slice(1, imported!.length - 1);

      const dependencies = getDependenciesForImport(
        importSource,
        chunk,
        bundle,
      );

      if (dependencies.size === 1) continue;

      hasReplacements = true;
      newCode.overwrite(
        match.index,
        match.index + originalImport!.length,
        preloadContentForDependencies(dependencies, originalImport!),
      );
    }

    if (hasReplacements) {
      newCode.prepend(getPreloadHelperFunction() + '\n');
    }

    chunk.code = newCode.toString();
  }
}

function preloadContentForDependencies(
  dependencies: Iterable<string>,
  originalExpression: string,
) {
  return `__quilt_preload(${JSON.stringify(Array.from(dependencies))}).then(() => {return ${originalExpression}})`;
}

function getDependenciesForImport(
  imported: string,
  chunk: OutputChunk,
  bundle: OutputBundle,
) {
  const originalFilename = chunk.fileName;
  const dependencies = new Set<string>();
  const analyzed = new Set<string>();

  const normalizedFile = path.posix.join(
    path.posix.dirname(originalFilename),
    imported,
  );

  const addDependencies = (filename: string) => {
    if (filename === originalFilename) return;
    if (analyzed.has(filename)) return;

    analyzed.add(filename);
    const chunk = bundle[filename];

    if (chunk == null) return;

    dependencies.add(chunk.fileName);

    if (chunk.type !== 'chunk') return;

    for (const imported of chunk.imports) {
      addDependencies(imported);
    }
  };

  addDependencies(normalizedFile);

  return dependencies;
}

function getPreloadHelperFunction({
  type = 'module',
}: {type?: 'module' | 'script'} = {}) {
  const scriptRel = type === 'module' ? 'modulepreload' : 'preload';

  return multiline`
    const __quilt_preload=(()=>{var e,t,r;let n=new Map;return function __quilt_preload(t){if(0===t.length)return Promise.resolve();let r=Promise.all(t.map(e=>{let t=e.startsWith("/")?e:"/"+e;if(n.has(t))return;n.set(t,!0);let r=t.endsWith(".css");if(null!=document.querySelector(\`link[href="\${t}"]\`))return;let l=document.createElement("link");if(r?l.rel="stylesheet":(l.as="script",l.rel=${scriptRel}),l.crossOrigin="",l.href=t,document.head.appendChild(l),r)return new Promise(e=>{l.addEventListener("load",()=>e()),l.addEventListener("error",r=>e(new PreloadError(t,{cause:r})))})}));return r.then(e=>{for(let t of e)null!=t&&l(t)})};function l(e){let t=new PreloadErrorEvent(e);if(window.dispatchEvent(t),!t.defaultPrevented)throw e}})();
  `;
}

// Source for minified code above:
//
// const __quilt_preload = (() => {
//   const SEEN = new Map();
//   const SCRIPT_REL = 'module';

//   return function __quiltPreload(dependencies) {
//     if (dependencies.length === 0) return Promise.resolve();

//     const promise = Promise.all(
//       dependencies.map((dependency) => {
//         const resolved = dependency.startsWith('/')
//           ? dependency
//           : '/' + dependency;

//         if (SEEN.has(resolved)) return;
//         SEEN.set(resolved, true);

//         const isCSS = resolved.endsWith('.css');

//         if (document.querySelector(`link[href="${resolved}"]`) != null) {
//           return;
//         }

//         const link = document.createElement('link');

//         if (isCSS) {
//           link.rel = 'stylesheet';
//         } else {
//           link.as = 'script';
//           link.rel = scriptRel;
//         }

//         link.crossOrigin = '';
//         link.href = resolved;
//         document.head.appendChild(link);

//         // We will only wait for CSS
//         if (isCSS) {
//           return new Promise((resolve) => {
//             link.addEventListener('load', () => resolve());
//             link.addEventListener('error', (error) =>
//               resolve(new PreloadError(resolved, {cause: error})),
//             );
//           });
//         }
//       }),
//     );

//     return promise.then((results) => {
//       for (const result of results) {
//         if (result != null) {
//           handlePreloadError(result);
//         }
//       }
//     });
//   };

//   function handlePreloadError(error) {
//     const event = new PreloadErrorEvent(error);
//     window.dispatchEvent(event);

//     if (!event.defaultPrevented) {
//       throw error;
//     }
//   }

//   class PreloadError extends Error {
//     constructor(source, {cause} = {}) {
//       super(`Unable to preload ${source}`, {cause});
//       this.source = source;
//     }
//   }

//   class PreloadErrorEvent extends Event {
//     constructor(error) {
//       super('quilt:preload-error', {cancelable: true});
//       this.error = error;
//     }
//   }
// })();
