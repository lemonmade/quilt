import type {ReactElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';

import {ServerRenderManagerContext} from './context';
import {ServerRenderManager} from './manager';
import type {
  ServerRenderPass,
  ServerActionKind,
  ServerActionOptions,
  ServerActionPerform,
  ServerRenderRequestContext,
} from './types';

export {ServerRenderManager, ServerRenderManagerContext};
export type {
  ServerRenderPass,
  ServerActionKind,
  ServerActionOptions,
  ServerActionPerform,
  ServerRenderRequestContext,
};

export {useServerAction} from './hooks';
export {ServerAction} from './ServerAction';

export interface Options {
  includeKinds?: symbol[] | boolean;
  maxPasses?: number;
  context?: ServerRenderRequestContext;
  decorate?(element: ReactElement<any>): ReactElement<any>;
  renderFunction?(element: ReactElement<Record<string, never>>): string;
  betweenEachPass?(pass: ServerRenderPass): any;
  afterEachPass?(pass: ServerRenderPass): any;
}

const DEFAULT_MAX_PASSES = 5;

export function extract(
  app: ReactElement<any>,
  {
    context,
    includeKinds,
    maxPasses = DEFAULT_MAX_PASSES,
    decorate = identity,
    renderFunction = renderToStaticMarkup,
    betweenEachPass,
    afterEachPass,
  }: Options = {},
) {
  const manager = new ServerRenderManager({context, includeKinds});
  const element = (
    <ServerRenderManagerContext.Provider value={manager}>
      {decorate(app)}
    </ServerRenderManagerContext.Provider>
  );

  return (async function perform(index = 0): Promise<string | undefined> {
    const start = Date.now();
    const {rendered, finished} = manager.render(() => renderFunction(element));
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

      return rendered;
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

      return performNextPass ? perform(index + 1) : rendered;
    }
  })();
}

function shouldContinue(result: unknown) {
  return result !== false;
}

function identity<T>(value: T): T {
  return value;
}
