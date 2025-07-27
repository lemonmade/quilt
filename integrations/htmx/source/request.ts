/**
 * @see https://htmx.org/docs/#request-headers
 */
export interface HTMXRequestDetails {
  /**
   * Indicates that the request is via an element using `hx-boost`. This value
   * is parsed from the `HX-Boosted` header.
   *
   * @see https://htmx.org/attributes/hx-boost/
   */
  boosted: boolean;

  /**
   * The current URL of the browser. This value is parsed from the `HX-Current-URL`
   * header.
   */
  currentURL: URL;

  /**
   * Indicates that the request is for history restoration after a miss in the local
   * history cache. This value is parsed from the `HX-History-Restore-Request` header.
   */
  historyRestoreRequest: boolean;

  /**
   * The user response to an `hx-prompt`.
   *
   * @see https://htmx.org/attributes/hx-prompt/
   */
  prompt?: string;

  /**
   * The `id` of the target element if it exists. This value is parsed from the
   * `HX-Target` header.
   */
  target?: string;

  /**
   * The `id` of the triggered element if it exists. This value is parsed from the
   * `HX-Trigger` header.
   */
  trigger?: string;

  /**
   * The `name` of the triggered element if it exists. This value is parsed from the
   * `HX-Trigger-Name` header.
   */
  triggerName?: string;
}

/**
 * An enhanced request object that parses the HTMX request headers into an
 * `htmx` property.
 *
 * @see https://htmx.org/docs/#request-headers
 */
export class HTMXRequest extends Request {
  /**
   * The parsed HTMX request headers.
   *
   * @see https://htmx.org/docs/#request-headers
   */
  readonly htmx: HTMXRequestDetails;

  constructor(info: RequestInfo | URL, options?: RequestInit) {
    super(info, options);

    const htmx = parseHTMXRequestHeaders(this.headers);

    if (htmx == null) {
      throw new Error(
        'Could not parse HTMX request headers. Is this a HTMX request?',
      );
    }

    this.htmx = htmx;
  }
}

/**
 * Parses the HTMX request headers into an easy-to-use JavaScript object.
 * If the request does not contain the mandatory HTMX headers, this function
 * will return `undefined`.
 *
 * @see https://htmx.org/docs/#request-headers
 */
export function parseHTMXRequestHeaders(
  headers: Headers,
): HTMXRequestDetails | undefined {
  const isHTMX = headers.get('HX-Request') === 'true';
  const currentURL = headers.get('HX-Current-URL');

  if (!isHTMX || !currentURL) return;

  return {
    boosted: headers.get('HX-Boosted') === 'true',
    currentURL: new URL(currentURL),
    historyRestoreRequest: headers.get('HX-History-Restore-Request') === 'true',
    prompt: headers.get('HX-Prompt') ?? undefined,
    target: headers.get('HX-Target') ?? undefined,
    trigger: headers.get('HX-Trigger') ?? undefined,
    triggerName: headers.get('HX-Trigger-Name') ?? undefined,
  };
}
