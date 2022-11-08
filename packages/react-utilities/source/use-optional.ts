export interface UseOptionalValueHook<T> {
  (options?: {required?: true}): NonNullable<T>;
  (options: {required: false}): NonNullable<T> | undefined;
}

export interface UseOptionalValueHookOptions<_T> {
  whenMissing?(): Error;
}

export function createUseOptionalValueHook<T>(
  hook: () => T,
  {whenMissing = createDefaultError}: UseOptionalValueHookOptions<T> = {},
) {
  const useOptionalValue: UseOptionalValueHook<T> = ({
    required = true,
  } = {}) => {
    const value = hook() ?? undefined;

    if (required && value == null) {
      throw whenMissing();
    }

    return value as any;
  };

  return useOptionalValue;
}

function createDefaultError() {
  return new Error('Missing required value');
}
