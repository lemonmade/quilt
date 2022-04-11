/**
 * Status code response classes, mapped to their status code range.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Status
 */
export enum ResponseType {
  Informational = '1xx',
  Success = '2xx',
  Redirection = '3xx',
  ClientError = '4xx',
  ServerError = '5xx',
  Unknown = 'unknown',
}
