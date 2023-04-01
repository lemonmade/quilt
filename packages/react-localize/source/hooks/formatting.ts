import {useContext} from 'react';
import {LocalizedFormattingContext} from '../context.ts';

export function useLocalizedFormatting() {
  const formatting = useContext(LocalizedFormattingContext);

  if (formatting == null) {
    throw new Error(
      'useLocalizedFormatting must be used within a LocalizedFormattingContext',
    );
  }

  return formatting;
}
