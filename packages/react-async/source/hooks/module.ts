import {useEffect} from 'react';
import type {AsyncModule} from '@quilted/async';
import {useModuleAssets} from '@quilted/react-assets';

export function useAsyncModule<Module>(
  asyncModule: AsyncModule<Module>,
  {
    scripts,
    styles,
    immediate = true,
  }: Parameters<typeof useModuleAssets>[1] & {immediate?: boolean} = {},
): AsyncModule<Module> {
  if (immediate && !asyncModule.isLoading) {
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
