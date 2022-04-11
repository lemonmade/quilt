import type {ReactElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';

import {ServerRenderContext} from './context';
import {ServerRenderManager} from './manager';
import {ServerRenderPass} from './types';

export {ServerRenderManager, ServerRenderContext};
export type {ServerRenderPass};

export {useServerAction} from './hook';
export {ServerAction} from './ServerAction';

export interface Options {
  includeKinds?: symbol[] | boolean;
  maxPasses?: number;
  decorate?(element: ReactElement<any>): ReactElement<any>;
  renderFunction?(element: ReactElement<Record<string, never>>): string;
  betweenEachPass?(pass: ServerRenderPass): any;
  afterEachPass?(pass: ServerRenderPass): any;
}

const DEFAULT_MAX_PASSES = 5;

export function extract(
  app: ReactElement<any>,
  {
    includeKinds,
    maxPasses = DEFAULT_MAX_PASSES,
    decorate = identity,
    renderFunction = renderToStaticMarkup,
    betweenEachPass,
    afterEachPass,
  }: Options = {},
) {
  const manager = new ServerRenderManager({includeKinds});
  const element = (
    <ServerRenderContext.Provider value={manager}>
      {decorate(app)}
    </ServerRenderContext.Provider>
  );

  return (async function perform(index = 0): Promise<string> {
    const start = Date.now();
    const result = renderFunction(element);
    const {finished} = manager.seal();
    const cancelled = !finished && index + 1 >= maxPasses;

    const resolveStart = Date.now();
    const renderDuration = resolveStart - start;

    if (!cancelled) {
      await manager.resolveAllEffects();
    }

    const resolveDuration = Date.now() - resolveStart;

    if (finished || cancelled) {
      await manager.afterEachPass({
        index,
        finished: true,
        cancelled,
        renderDuration,
        resolveDuration,
      });

      if (afterEachPass) {
        await afterEachPass({
          index,
          finished: true,
          cancelled,
          renderDuration,
          resolveDuration,
        });
      }

      return result;
    } else {
      let performNextPass = true;

      performNextPass =
        shouldContinue(
          await manager.afterEachPass({
            index,
            finished: false,
            cancelled: false,
            renderDuration,
            resolveDuration,
          }),
        ) && performNextPass;

      if (afterEachPass) {
        performNextPass =
          shouldContinue(
            await afterEachPass({
              index,
              finished: false,
              cancelled: false,
              renderDuration,
              resolveDuration,
            }),
          ) && performNextPass;
      }

      if (performNextPass) {
        await manager.betweenEachPass({
          index,
          finished: false,
          cancelled: false,
          renderDuration,
          resolveDuration,
        });

        if (betweenEachPass) {
          await betweenEachPass({
            index,
            finished: false,
            cancelled: false,
            renderDuration,
            resolveDuration,
          });
        }

        manager.reset();
      }

      return performNextPass ? perform(index + 1) : result;
    }
  })();
}

function shouldContinue(result: unknown) {
  return result !== false;
}

function identity<T>(value: T): T {
  return value;
}
