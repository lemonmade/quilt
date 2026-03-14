import {createContext} from 'preact';
import {useContext} from 'preact/hooks';

/**
 * The shared context interface for Quilt applications. Each Quilt library
 * augments this interface with its own optional, readonly fields. Application
 * code can also augment this interface to add app-specific context fields.
 *
 * @example
 * declare module '@quilted/preact-context' {
 *   interface QuiltContext {
 *     readonly myField?: MyType;
 *   }
 * }
 */
export interface QuiltContext {}

/**
 * The Preact context object that holds the shared `QuiltContext` value.
 * Use `QuiltFrameworkContextPreact.Provider` to provide context values, or use
 * the `useQuiltContext()` hook to read individual fields.
 */
export const QuiltFrameworkContextPreact = createContext<QuiltContext>({});
QuiltFrameworkContextPreact.displayName = 'QuiltFrameworkContext';

export interface UseQuiltContextHook {
  <K extends keyof QuiltContext>(
    field: K,
    options?: {optional?: false},
  ): NonNullable<QuiltContext[K]>;
  <K extends keyof QuiltContext>(
    field: K,
    options: {optional: boolean},
  ): NonNullable<QuiltContext[K]> | undefined;
}

/**
 * Reads a single field from the shared `QuiltContext`. By default, throws
 * if the field is not provided. Pass `{optional: true}` to return `undefined`
 * instead of throwing.
 */
export const useQuiltContext: UseQuiltContextHook = function useQuiltContext<
  K extends keyof QuiltContext,
>(field: K, {optional = false}: {optional?: boolean} = {}): any {
  const context = useContext(QuiltFrameworkContextPreact);
  const value = context[field] ?? undefined;

  if (!optional && value == null) {
    throw new Error(`Missing QuiltContext field: ${String(field)}`);
  }

  return value;
} satisfies UseQuiltContextHook;
