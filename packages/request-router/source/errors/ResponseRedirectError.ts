import {RedirectResponse} from '../response-helpers.ts';
import {type NavigateTo} from '../utilities.ts';
import {ResponseShortCircuitError} from './ResponseShortCircuitError.ts';

export class ResponseRedirectError extends ResponseShortCircuitError {
  constructor(
    to: NavigateTo,
    options?: Omit<ConstructorParameters<typeof RedirectResponse>[1], 'to'>,
  ) {
    const response = new RedirectResponse(to, options);
    super(
      response,
      `Redirecting to: ${response.headers.get('Location') ?? to}`,
    );
  }
}
