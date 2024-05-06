import {createContext, type Context} from 'preact';
import {useContext} from 'preact/hooks';

export interface OptionalContext<T> extends Context<T | undefined> {
  readonly use: UseOptionalContextHook<T>;
}

export interface OptionalContextOptions<_T> {
  displayName?: string;
  whenMissing?(): Error | void;
}

export interface UseOptionalContextHook<T> {
  (options?: {optional?: false}): NonNullable<T>;
  (options: {optional: boolean}): NonNullable<T> | undefined;
}

export function createOptionalContext<T>(
  defaultValue?: T,
  {whenMissing, displayName}: OptionalContextOptions<T> = {},
): OptionalContext<T> {
  const Context = createContext<T | undefined>(defaultValue);

  if (displayName) Object.assign(Context, {displayName});

  const resolvedWhenMissing =
    whenMissing ??
    (() => () => new Error(`Missing context: ${Context.displayName}`));

  Object.assign(Context, {
    use({optional = false}: {optional?: boolean} = {}) {
      resolvedWhenMissing;

      const value = useContext(Context) ?? undefined;

      if (!optional && value == null) {
        throw resolvedWhenMissing();
      }

      return value as any;
    },
  });

  return Context as OptionalContext<T>;
}
