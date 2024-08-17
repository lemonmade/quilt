export class ThreadClosedError extends Error {
  constructor() {
    super('You attempted to call a function on a closed thread.');
  }
}
