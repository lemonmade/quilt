import type {ProjectPlugin} from '../plugins';
import type {Service, ServiceOptions} from '../model';

import {ConfigurationBuilder, ConfigurationKind} from './base';

class ServiceBuilder extends ConfigurationBuilder<
  ProjectPlugin<Service>,
  ServiceOptions
> {
  constructor(root: string) {
    super(root, ConfigurationKind.Service);
  }

  /**
   * The entry file for this service.
   */
  entry(entry: string) {
    this.options.entry = entry;
    return this;
  }
}

/**
 * Defines a new backend service. The first argument should be a function
 * that is called with a “builder” object. You can call the methods on this
 * builder to configure the basic details about your service, and to include
 * the plugins you want to use.
 */
export function createService(
  create: (service: ServiceBuilder) => void | Promise<void>,
) {
  return async (root: string) => {
    const builder = new ServiceBuilder(root);
    await create(builder);
    return builder.finalize();
  };
}
