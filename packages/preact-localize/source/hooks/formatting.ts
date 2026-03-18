import {useQuiltContext} from '@quilted/preact-context';

export function useLocalizedFormatting() {
  return useQuiltContext('localization');
}
