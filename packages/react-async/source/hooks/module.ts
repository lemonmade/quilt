import {useEffect} from 'react';
import type {AsyncModule} from '@quilted/async';
import {useModuleAssets} from '@quilted/react-browser/server';

export function useAsyncModule<Module>(
  asyncModule: AsyncModule<Module>,
  {
    scripts,
    styles,
    defer = false,
  }: Parameters<typeof useModuleAssets>[1] & {defer?: boolean} = {},
): AsyncModule<Module> {
  if (!defer && asyncModule.module == null) {
    throw asyncModule.import();
  }

  useAsyncModuleAssets(asyncModule, {styles, scripts});

  return asyncModule;
}

export function useAsyncModuleAssets<Module>(
  module?: AsyncModule<Module>,
  options?: Parameters<typeof useModuleAssets>[1],
) {
  useModuleAssets(module?.id, options);
}

export function useAsyncModulePreload<Module = Record<string, unknown>>(
  asyncModule: AsyncModule<Module>,
) {
  useAsyncModuleAssets(asyncModule, {scripts: 'preload', styles: 'preload'});

  useEffect(() => {
    asyncModule.import();
  }, [asyncModule]);
}
