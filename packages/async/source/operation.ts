import {NestedAbortController, AbortError} from '@quilted/events';
import {signal, type Signal} from '@quilted/signals';

export type AsyncOperationStatus = 'pending' | 'resolved' | 'rejected';

export type AsyncOperationValue<T> = T extends Promise<infer Value>
  ? Value
  : T extends AsyncGenerator<infer Value, any, any>
  ? Awaited<Value>
  : never;

export interface AsyncOperation<
  Returned extends Promise<any> | AsyncGenerator<any, any, any> = Promise<any>,
> {
  readonly returned: Returned;
  readonly promise: Promise<AsyncOperationValue<Returned> | undefined>;
  readonly abort: AbortController['abort'];
  readonly signal: AbortSignal;
  readonly status: Signal<AsyncOperationStatus>;
  readonly value: Signal<AsyncOperationValue<Returned> | undefined>;
  readonly cause: Signal<unknown | undefined>;
}

export function runAsync<
  Returned extends Promise<any> | AsyncGenerator<any, any, any> = Promise<any>,
>(
  perform: (options: {signal: AbortSignal}) => Returned,
  {signal: abortSignal}: {signal?: AbortSignal} = {},
): AsyncOperation<Returned> {
  type Value = AsyncOperationValue<Returned>;

  const value = signal<AsyncOperationValue<Returned> | undefined>(undefined);
  const cause = signal<unknown | undefined>(undefined);
  const status = signal<AsyncOperationStatus>('pending');

  const abort = abortSignal
    ? new NestedAbortController(abortSignal)
    : new AbortController();
  const nestedAbortSignal = abort.signal;

  let returned: any;

  try {
    returned = perform({signal: nestedAbortSignal});
  } catch (error) {
    returned = Promise.reject(error);
  }

  const promise = (async () => {
    const handleAbort = () => {
      nestedAbortSignal.removeEventListener('abort', handleAbort);
      cause.value = nestedAbortSignal.reason ?? new AbortError();
      status.value = 'rejected';
    };

    const resolve = () => {
      if (!nestedAbortSignal.aborted) {
        nestedAbortSignal.removeEventListener('abort', handleAbort);
        status.value = 'resolved';
      }

      return value.peek();
    };

    nestedAbortSignal.addEventListener('abort', handleAbort);

    try {
      if (typeof returned['then'] === 'function') {
        const awaited = await (returned as Promise<Value>);

        if (!nestedAbortSignal.aborted) value.value = awaited;

        return resolve();
      } else {
        for await (const awaited of returned as AsyncGenerator<
          Value,
          Value,
          any
        >) {
          if (!nestedAbortSignal.aborted) value.value = awaited;
        }

        return resolve();
      }
    } catch (error) {
      if (!nestedAbortSignal.aborted) {
        cause.value = error;
        status.value = 'rejected';
      }
    }
  })();

  const operation: AsyncOperation<Returned> = {
    returned,
    promise,
    abort: abort.abort.bind(abort),
    signal: nestedAbortSignal,
    status,
    value,
    cause,
  };

  return operation;
}

// export class AsyncOperation<
//   Returned extends Promise<any> | AsyncGenerator<any, any, any> = Promise<any>,
//   Error = unknown,
// > {
//   private _status = signal('inactive');
//   private _value = signal<AsyncOperationValue<Returned> | undefined>(undefined);
//   private _cause = signal<Error | undefined>(undefined);
//   private _current = signal<AsyncOperationRun<Returned> | undefined>(undefined);
//   private _emitter = new EventEmitter<{
//     start: AsyncOperationRun<Returned>;
//     resolve: AsyncOperationValue<Returned>;
//     reject: Error;
//     yield: AsyncOperationValue<Returned>;
//   }>();

//   readonly on = this._emitter.on;
//   readonly once = this._emitter.once;

//   constructor(
//     private readonly _perform: (
//       // this: AsyncOperation<Value, Error, Returned>,
//       options: {signal?: AbortSignal},
//     ) => Returned,
//   ) {}

//   get status() {
//     return this._status.value;
//   }

//   get value() {
//     return this._value.value;
//   }

//   get cause() {
//     return this._cause.value;
//   }

//   get current() {
//     return this._current.value;
//   }

//   async run({
//     signal,
//     clean = false,
//   }: {signal?: AbortSignal; clean?: boolean} = {}): Promise<
//     AsyncOperationValue<Returned>
//   > {
//     type Value = AsyncOperationValue<Returned>;

//     const {_value, _status, _cause, _emitter, _perform} = this;

//     const abort = signal
//       ? new NestedAbortController(signal)
//       : new AbortController();

//     let returned: Returned;

//     try {
//       returned = _perform.call(this, {signal: abort.signal});
//     } catch (error) {
//       returned = Promise.reject(error) as any;
//     }

//     const run: AsyncOperationRun<Returned> = {
//       returned,
//       signal: abort.signal,
//       abort: abort.abort.bind(abort),
//     };

//     try {
//       const returned: any = _perform.call(this, {signal});
//       const run: AsyncOperationRun<Returned> = {
//         returned,
//         signal: abort.signal,
//         abort: abort.abort.bind(abort),
//       };

//       _status.value = 'pending';

//       if (clean) {
//         _value.value = undefined;
//         _cause.value = undefined;
//       }

//       if (typeof returned['then'] === 'function') {
//         const awaited = await (returned as Promise<Value>);

//         _value.value = awaited;
//         _cause.value = undefined;
//         _emitter.emit('updated', awaited);

//         _status.value = 'fulfilled';
//         _emitter.emit('fulfilled', awaited);

//         return awaited;
//       } else {
//         for await (const awaited of returned as AsyncGenerator<
//           Value,
//           Value,
//           any
//         >) {
//           _value.value = awaited;
//           _cause.value = undefined;
//           _emitter.emit('updated', awaited);
//         }

//         const value = _value.peek()!;

//         _status.value = 'fulfilled';
//         _emitter.emit('fulfilled', value);

//         return value;
//       }
//     } catch (error) {

//       _value.value = undefined;
//       _cause.value = error as any;
//       _status.value = 'rejected';
//       _emitter.emit('rejected', error as any);

//       throw error;
//     }
//   }
// }
