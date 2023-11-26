import type {OutputOptions} from 'rollup';

export interface ServerRuntime {
  /**
   * A string that will be inlined directly as code to reference a runtime constant
   * that contains environment variables.
   */
  env?: string;

  /**
   * Overrides to the output options for this server.
   */
  output?: {
    /**
     * What module format to use for the server output.
     *
     * @default 'module'
     */
    format?:
      | 'module'
      | 'modules'
      | 'esmodules'
      | 'esm'
      | 'es'
      | 'commonjs'
      | 'cjs';

    /**
     * The directory to output the server to.
     */
    directory?: string;

    /**
     * Overrides to the Rollup output options.
     */
    options?: OutputOptions;
  };

  /**
   * The content to use as the entry point when the server uses the `request-router`
   * format for their server. This file should import the request router instance for
   * this app from 'quilt:module/request-router', and create a server that is appropriate
   * for this runtime.
   */
  requestRouter?(): string;
}
