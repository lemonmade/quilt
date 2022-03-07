import type {ProjectPlugin} from '../plugins';
import type {App, AppOptions} from '../model';

import {ConfigurationBuilder, ConfigurationKind} from './base';

class AppOptionBuilder extends ConfigurationBuilder<
  ProjectPlugin<App>,
  AppOptions
> {
  constructor(root: string) {
    super(root, ConfigurationKind.App);
  }

  /**
   * The entry file for this application.
   */
  entry(entry: string) {
    this.options.entry = entry;
    return this;
  }
}

/**
 * Defines a new application. The first argument should be a function
 * that is called with a “builder” object. You can call the methods on this
 * builder to configure the basic details about your app, and to include
 * the plugins you want to use.
 */
export function createApp(
  create: (app: AppOptionBuilder) => void | Promise<void>,
) {
  return async (root: string) => {
    const builder = new AppOptionBuilder(root);
    await create(builder);
    return builder.finalize();
  };
}
