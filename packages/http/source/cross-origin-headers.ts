/**
 * Allowed values for the `Cross-Origin-Resource-Policy` header.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cross-Origin-Opener-Policy
 * @see https://web.dev/security-headers/#coop
 */
export type CrossOriginEmbedderPolicyHeaderValue =
  | 'unsafe-none'
  | 'require-corp'
  | 'credentialless';

/**
 * Allowed values for the `Cross-Origin-Resource-Policy` header.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cross-Origin-Opener-Policy
 * @see https://web.dev/security-headers/#coop
 */
export type CrossOriginOpenerPolicyHeaderValue =
  | 'unsafe-none'
  | 'same-origin-allow-popups'
  | 'same-origin';

/**
 * Allowed values for the `Cross-Origin-Resource-Policy` header.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cross-Origin-Resource-Policy
 * @see https://web.dev/security-headers/#corp
 */
export type CrossOriginResourcePolicyHeaderValue =
  | 'same-origin'
  | 'same-site'
  | 'cross-origin';
