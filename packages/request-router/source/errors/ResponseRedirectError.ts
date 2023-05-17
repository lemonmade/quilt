import {redirect} from '../response-helpers.ts';
import {type NavigateTo} from '../utilities.ts';
import {ResponseShortCircuitError} from './ResponseShortCircuitError.ts';

export class ResponseRedirectError extends ResponseShortCircuitError {
  constructor(
    to: NavigateTo,
    options?: Omit<Parameters<typeof redirect>[1], 'to'>,
  ) {
    const response = redirect(to, options);
    super(
      redirect(to, options),
      `Redirecting to: ${response.headers.get('Location') ?? to}`,
    );
  }
}
