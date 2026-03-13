import {useMemo} from 'preact/hooks';
import type {ComponentChildren} from 'preact';

import {QuiltFrameworkContextPreact} from '@quilted/preact-context';
import {TestNavigation} from '@quilted/preact-router/testing';
import {TestBrowser} from '@quilted/preact-browser/testing';
import {Localization} from '@quilted/preact-localize';

export interface QuiltFrameworkTestContextProps {
  /**
   * A custom navigation instance for the test. Defaults to a new `TestNavigation`
   * pointed at `https://example.com/`.
   *
   * @see TestNavigation
   */
  navigation?: TestNavigation;

  /**
   * The localization instance for the test. Defaults to `new Localization('en')`.
   *
   * @see Localization
   */
  localization?: Localization;

  /**
   * A custom browser mock for the test. Defaults to a new `TestBrowser`.
   *
   * @see TestBrowser
   */
  browser?: TestBrowser;

  children?: ComponentChildren;
}

/**
 * Provides a `QuiltContext` configured with test-friendly instances of
 * navigation, localization, and browser details. Use this in unit tests
 * to wrap components that need Quilt context.
 *
 * @example
 * const navigation = new TestNavigation('/my-page');
 * render(
 *   <QuiltFrameworkTestContext navigation={navigation} localization={new Localization('fr')}>
 *     <MyComponent />
 *   </QuiltFrameworkTestContext>
 * );
 */
export function QuiltFrameworkTestContext({
  navigation,
  localization = new Localization('en'),
  browser,
  children,
}: QuiltFrameworkTestContextProps) {
  const resolvedNavigation = useMemo(() => navigation ?? new TestNavigation(), [navigation]);
  const resolvedBrowser = useMemo(() => browser ?? new TestBrowser(), [browser]);

  const value = useMemo(
    () => ({
      navigation: resolvedNavigation,
      localization,
      browser: resolvedBrowser,
    }),
    [resolvedNavigation, localization, resolvedBrowser],
  );

  return (
    <QuiltFrameworkContextPreact.Provider value={value}>
      {children}
    </QuiltFrameworkContextPreact.Provider>
  );
}
