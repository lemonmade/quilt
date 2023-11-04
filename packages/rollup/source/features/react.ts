import type {Plugin} from 'rollup';

export function react() {
  return {
    name: '@quilted/react',
    options(options) {
      return {
        ...options,
        onLog(level, log, handler) {
          if (
            log.code === 'MODULE_LEVEL_DIRECTIVE' &&
            /['"]use client['"]/.test(log.message)
          ) {
            return;
          }

          if (options.onLog) {
            options.onLog(level, log, handler);
          } else {
            handler(level, log);
          }
        },
      };
    },
  } satisfies Plugin;
}
