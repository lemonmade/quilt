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
    async generateBundle(options, bundle) {
      if (preload) {
        switch (options.format) {
          case 'es': {
            await preloadAsyncAssetsInESMBundle(bundle, {baseURL});
            break;
          }
          case 'system': {
            await preloadAsyncAssetsInSystemJSBundle(bundle, {baseURL});
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

async function preloadAsyncAssetsInESMBundle(
  bundle: OutputBundle,
  {baseURL = '/'}: {baseURL?: string} = {},
) {
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
        {baseURL},
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

async function preloadAsyncAssetsInSystemJSBundle(
  bundle: OutputBundle,
  {baseURL = '/'}: {baseURL?: string} = {},
) {
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
        {baseURL},
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
  {baseURL = '/'}: {baseURL?: string} = {},
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

    const url = `${baseURL}${baseURL.endsWith('/') ? '' : '/'}${chunk.fileName}`;

    dependencies.add(url);

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
  const scriptRel = JSON.stringify(
    type === 'module' ? 'modulepreload' : 'preload',
  );

  return multiline`
    const __quilt_preload=(()=>{const o=new Map,f=${scriptRel};class QuiltPreloadError extends Error{constructor(e,{cause:l}={}){super(\`Unable to preload \${e}\`,{cause:l}),this.source=e}}class QuiltPreloadErrorEvent extends Event{constructor(e){super("quilt:preload-error",{cancelable:!0}),this.error=e}}return function __quilt_preload(e){return e.length===0?Promise.resolve():Promise.all(e.map(s=>{const r=s.startsWith("/")?s:"/"+s;if(o.has(r))return;o.set(r,!0);const i=r.endsWith(".css");if(document.querySelector(\`link[href="\${r}"]\`)!=null)return;const t=document.createElement("link");if(i?t.rel="stylesheet":(t.as="script",t.rel=f),t.crossOrigin="",t.href=r,document.head.appendChild(t),i)return new Promise(a=>{t.addEventListener("load",()=>a()),t.addEventListener("error",h=>a(new QuiltPreloadError(r,{cause:h})))})})).then(s=>{for(const r of s)r!=null&&d(r)})};function d(n){const e=new QuiltPreloadErrorEvent(n);if(window.dispatchEvent(e),!e.defaultPrevented)throw n}})();
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
