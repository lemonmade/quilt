export const MESSAGE_CALL = 1;
export const MESSAGE_CALL_RESULT = 2;
export const MESSAGE_FUNCTION_CALL = 3;
export const MESSAGE_FUNCTION_RESULT = 4;
export const MESSAGE_FUNCTION_RELEASE = 5;

export const SERIALIZE_METHOD = Symbol.for('quilt.threads.serialize');
export const TRANSFERABLE = Symbol.for('quilt.threads.transferable');

export const RETAIN_METHOD = Symbol.for('quilt.threads.retain');
export const RELEASE_METHOD = Symbol.for('quilt.threads.release');
export const RETAINED_BY = Symbol.for('quilt.threads.retained-by');
