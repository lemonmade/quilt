import type {InputOptions} from 'rollup';
import replace, {type RollupReplaceOptions} from '@rollup/plugin-replace';

export function smartReplace(
  values: NonNullable<RollupReplaceOptions['values']>,
  options?: Omit<RollupReplaceOptions, 'values'>,
) {
  return replace({
    // @see https://github.com/vitejs/vite/blob/2b1ffe86328f9d06ef9528ee117b61889893ddcc/packages/vite/src/node/plugins/define.ts#L108-L119
    delimiters: [
      '(?<![\\p{L}\\p{N}_$]|(?<!\\.\\.)\\.)(',
      ')(?:(?<=\\.)|(?![\\p{L}\\p{N}_$]|\\s*?=[^=]))',
    ],
    preventAssignment: true,
    ...options,
    values,
  });
}

export function addRollupOnWarn(
  options: InputOptions,
  warn: NonNullable<InputOptions['onwarn']>,
): InputOptions {
  const {onwarn: originalOnWarn} = options;

  return {
    ...options,
    onwarn(warning, defaultWarn) {
      warn(warning, (warning) => {
        if (originalOnWarn && typeof warning === 'object') {
          originalOnWarn(warning, defaultWarn);
        } else {
          defaultWarn(warning);
        }
      });
    },
  };
}
