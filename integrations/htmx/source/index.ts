import {EnhancedResponse} from '@quilted/request-router';

export interface HTMXTriggerEvent {
  event: string;
  detail?: unknown | null;
}

export type HTMXTriggerOption =
  | string
  | readonly (string | HTMXTriggerEvent)[]
  | Record<string, unknown>;

/**
 * @see https://htmx.org/headers/hx-location/
 */
export interface HTMXLocationContext {
  source?: string;
  event?: string;
  handler?: string;
  target?: string;
  swap?: HTMXSwapTarget;
  values?: unknown;
  headers?: unknown;
  select?: string;
}

/**
 * @see https://htmx.org/attributes/hx-swap/
 */
export type HTMXSwapTarget =
  /**
   * Replace the inner html of the target element
   */
  | 'innerHTML'
  /**
   * Replace the entire target element with the response
   */
  | 'outerHTML'
  /**
   * Insert the response before the target element
   */
  | 'beforebegin'
  /**
   * Insert the response before the first child of the target element
   */
  | 'afterbegin'
  /**
   * Insert the response after the last child of the target element
   */
  | 'beforeend'
  /**
   * Insert the response after the target element
   */
  | 'afterend'
  /**
   * Deletes the target element regardless of the response
   */
  | 'delete'
  /**
   * Does not append content from response (out of band items will still be processed)
   */
  | 'none';

/**
 * @see https://htmx.org/docs/#response-headers
 */
export interface HTMXResponseOptions {
  /**
   * Allows you to do a client-side redirect that does not do a full page reload
   */
  location?: string | URL | ({path: string} & HTMXLocationContext);

  /**
   * Can be used to do a client-side redirect to a new location
   */
  redirect?: string | URL;

  /**
   * Pushes a new url into the history stack
   */
  pushURL?: string | URL | boolean;

  /**
   * Replaces the current URL in the location bar
   */
  replaceURL?: string | URL | boolean;

  /**
   * Forces the client to do a full refresh of the page.
   */
  refresh?: boolean;

  /**
   * Allows you to specify how the response will be swapped.
   *
   * @see https://htmx.org/attributes/hx-swap/
   */
  swap?: HTMXSwapTarget;

  /**
   * A CSS selector that updates the target of the content update to a different element on the page
   */
  target?: string;

  /**
   * A CSS selector that allows you to choose which part of the response is used to be swapped in.
   * Overrides an existing [`hx-select`](https://htmx.org/attributes/hx-select/) on the triggering element
   */
  select?: string;

  /**
   * Allows you to trigger client-side events
   */
  trigger?: HTMXTriggerOption;

  /**
   * Allows you to trigger client-side events after the settle step
   */
  triggerAfterSettle?: HTMXTriggerOption;

  /**
   * Allows you to trigger client-side events after the swap step
   */
  triggerAfterSwap?: HTMXTriggerOption;
}

export class HTMXResponse extends EnhancedResponse {
  constructor(
    body?: BodyInit | null,
    {htmx, ...options}: ResponseInit & {htmx?: HTMXResponseOptions} = {},
  ) {
    super(body, options);

    this.headers.set('Content-Type', 'text/html; charset=utf-8');

    if (htmx) {
      setHTMXResponseHeaders(this.headers, htmx);
    }
  }
}

export function setHTMXResponseHeaders(
  headers: Headers,
  {
    location,
    redirect,
    pushURL,
    replaceURL,
    refresh,
    swap,
    target,
    select,
    trigger,
    triggerAfterSettle,
    triggerAfterSwap,
  }: HTMXResponseOptions,
) {
  if (typeof location === 'string' || location instanceof URL) {
    headers.set('HX-Location', location.toString());
  } else if (location) {
    headers.set('HX-Location', JSON.stringify(location));
  }

  if (typeof redirect === 'string' || redirect instanceof URL) {
    headers.set('HX-Redirect', redirect.toString());
  }

  if (pushURL === false) {
    headers.set('HX-Push-Url', 'false');
  } else if (typeof pushURL === 'string' || pushURL instanceof URL) {
    headers.set('HX-Push-Url', pushURL.toString());
  }

  if (replaceURL === false) {
    headers.set('HX-Replace-Url', 'false');
  } else if (typeof replaceURL === 'string' || replaceURL instanceof URL) {
    headers.set('HX-Replace-Url', replaceURL.toString());
  }

  if (refresh) {
    headers.set('HX-Refresh', 'true');
  }

  if (swap) {
    headers.set('HX-Reswap', swap);
  }

  if (target) {
    headers.set('HX-Retarget', target);
  }

  if (select) {
    headers.set('HX-Reselect', select);
  }

  if (trigger) {
    headers.set('HX-Trigger', serializeHTMXTriggerHeader(trigger));
  }

  if (triggerAfterSettle) {
    headers.set(
      'HX-Trigger-After-Settle',
      serializeHTMXTriggerHeader(triggerAfterSettle),
    );
  }

  if (triggerAfterSwap) {
    headers.set(
      'HX-Trigger-After-Swap',
      serializeHTMXTriggerHeader(triggerAfterSwap),
    );
  }

  return headers;
}

function serializeHTMXTriggerHeader(value: HTMXTriggerOption): string {
  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value)) {
    let allEmptyDetails = true;
    const eventMap: Record<string, unknown> = {};

    for (const eventDescription of value) {
      if (typeof eventDescription === 'string') {
        eventMap[eventDescription] = null;
      } else {
        allEmptyDetails = allEmptyDetails && eventDescription.detail == null;
        eventMap[eventDescription.event] = eventDescription.detail;
      }
    }

    if (allEmptyDetails) return Object.keys(eventMap).join(', ');

    return JSON.stringify(eventMap);
  }

  return JSON.stringify(value);
}
