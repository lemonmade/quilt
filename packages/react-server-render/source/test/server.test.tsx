/**
 * @jest-environment node
 */

import {renderToString, renderToStaticMarkup} from 'react-dom/server';
import {describe, it, expect} from '@quilted/testing';

import {ServerAction} from '../ServerAction.tsx';
import {extract} from '../server.tsx';

describe('extract()', () => {
  it('calls actions', async () => {
    const spy = jest.fn(() => undefined);
    await extract(<ServerAction perform={spy} />);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('waits for actions to resolve', async () => {
    const {promise, resolve, resolved} = createResolvablePromise();
    const spy = jest.fn(() => (resolved() ? promise : undefined));
    const extractSpy = jest.fn();
    const extractPromise = extract(<ServerAction perform={spy} />).then(
      extractSpy,
    );

    expect(extractSpy).not.toHaveBeenCalled();

    await resolve();
    // Some versions of Node need one extra tick for all .then()
    // calls on the promise to resolve
    await new Promise((resolve) => process.nextTick(resolve));

    expect(extractSpy).toHaveBeenCalled();

    await extractPromise;
  });

  it('calls betweenEachPass on each used kind', async () => {
    const {resolve, resolved} = createResolvablePromise();
    const kind = {id: Symbol('id'), betweenEachPass: jest.fn()};
    await extract(
      <ServerAction
        perform={() => (resolved() ? undefined : resolve())}
        kind={kind}
      />,
    );
    expect(kind.betweenEachPass).toHaveBeenCalledTimes(1);
  });

  it('calls afterEachPass on each used kind', async () => {
    const kind = {id: Symbol('id'), afterEachPass: jest.fn()};
    await extract(<ServerAction perform={noop} kind={kind} />);
    expect(kind.afterEachPass).toHaveBeenCalledTimes(1);
  });

  it('bails out if afterEachPass on any kind returns false', async () => {
    const kind = {
      id: Symbol('id'),
      afterEachPass: jest.fn(() => Promise.resolve(false)),
    };

    await extract(
      <ServerAction perform={() => Promise.resolve()} kind={kind} />,
    );

    expect(kind.afterEachPass).toHaveBeenCalledTimes(1);
  });

  it('does not call betweenEachPass if afterEachPass bails out', async () => {
    const kind = {
      id: Symbol('id'),
      afterEachPass: () => Promise.resolve(false),
      betweenEachPass: jest.fn(),
    };

    await extract(
      <ServerAction perform={() => Promise.resolve()} kind={kind} />,
    );

    expect(kind.betweenEachPass).toHaveBeenCalledTimes(0);
  });

  it('does not perform actions outside of extract()', () => {
    const spy = jest.fn(() => undefined);
    renderToString(<ServerAction perform={spy} />);
    expect(spy).not.toHaveBeenCalled();
  });

  describe('decorate', () => {
    it('is called with the app element', async () => {
      const spy = jest.fn((element: any) => element);
      const element = <div>Hello world</div>;
      await extract(element, {decorate: spy});
      expect(spy).toHaveBeenCalledWith(element);
    });
  });

  describe('renderFunction', () => {
    it('returns the result of calling renderToStaticMarkup by default', async () => {
      const element = <div>Hello world</div>;
      const result = await extract(element);
      expect(result).toBe(renderToStaticMarkup(element));
    });

    it('uses a custom render function', async () => {
      const mockResult = '<how-did-i-get-here />';
      const spy = jest.fn(() => mockResult);
      const element = <div>Hello world</div>;
      const result = await extract(element, {renderFunction: spy});
      expect(result).toBe(mockResult);
    });
  });

  describe('betweenEachPass', () => {
    it('is not called when there is only a single pass', async () => {
      const spy = jest.fn();
      await extract(<ServerAction perform={noop} />, {
        betweenEachPass: spy,
      });
      expect(spy).not.toHaveBeenCalled();
    });

    it('is called between passes', async () => {
      const spy = jest.fn();
      const {resolve, resolved} = createResolvablePromise();
      await extract(
        <ServerAction perform={() => (resolved() ? undefined : resolve())} />,
        {
          betweenEachPass: spy,
        },
      );
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe('afterEachPass', () => {
    it('is called when there is only a single pass', async () => {
      const spy = jest.fn();
      await extract(<ServerAction perform={noop} />, {
        afterEachPass: spy,
      });
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('is called after each pass', async () => {
      const spy = jest.fn();
      const {resolve, resolved} = createResolvablePromise();
      await extract(
        <ServerAction perform={() => (resolved() ? undefined : resolve())} />,
        {
          afterEachPass: spy,
        },
      );
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it('bails out if it returns false', async () => {
      const spy = jest.fn(() => Promise.resolve(false));
      await extract(<ServerAction perform={() => Promise.resolve()} />, {
        afterEachPass: spy,
      });
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe('includeKinds', () => {
    it('calls actions matching the passed IDs', async () => {
      const id = Symbol('id');
      const spy = jest.fn(() => undefined);
      await extract(<ServerAction perform={spy} kind={{id}} />, {
        includeKinds: [id],
      });
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('does not call actions that don’t match the passed IDs', async () => {
      const id = Symbol('id');
      const spy = jest.fn();
      await extract(<ServerAction perform={spy} kind={{id}} />, {
        includeKinds: [],
      });
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('maxPasses', () => {
    it('does not perform another pass when the limit is reached', async () => {
      const spy = jest.fn();
      const maxPasses = 2;
      const {resolve} = createResolvablePromise();

      await extract(<ServerAction perform={resolve} />, {
        maxPasses,
        afterEachPass: spy,
      });

      expect(spy).toHaveBeenCalledTimes(maxPasses);
      expect(spy).not.toHaveBeenCalledWith({
        finished: true,
        cancelled: true,
      });
    });

    it('performs afterEachPasses but not betweenEachPasses when the limit is reached', async () => {
      const maxPasses = 2;
      const {resolve} = createResolvablePromise();

      const betweenSpy = jest.fn();
      const afterSpy = jest.fn();
      const kind = {
        id: Symbol('id'),
        betweenEachPass: jest.fn(),
        afterEachPass: jest.fn(),
      };

      await extract(<ServerAction perform={resolve} kind={kind} />, {
        maxPasses,
        afterEachPass: afterSpy,
        betweenEachPass: betweenSpy,
      });

      expect(kind.betweenEachPass).toHaveBeenCalledTimes(maxPasses - 1);
      expect(betweenSpy).toHaveBeenCalledTimes(maxPasses - 1);

      expect(kind.afterEachPass).toHaveBeenCalledTimes(maxPasses);
      expect(afterSpy).toHaveBeenCalledTimes(maxPasses);
    });
  });
});

function createResolvablePromise() {
  let promiseResolve!: () => void;
  let resolved = false;

  const promise = new Promise<void>((resolve) => {
    promiseResolve = resolve;
  });

  return {
    promise,
    resolve: () => {
      promiseResolve();
      resolved = true;
      return promise;
    },
    resolved: () => resolved,
  };
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
function noop() {}
