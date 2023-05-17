export class ResponseShortCircuitError extends Error {
  constructor(
    public readonly response: Response,
    message = `Short circuiting with status code: ${response.status}`,
  ) {
    super(message);
  }
}
