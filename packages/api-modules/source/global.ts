export interface ApiModulesGlobal {
  register(path: string, module: unknown): void;
}

export function installApiModulesGlobal() {
  const cache = new Map<string, unknown>();

  const ApiModules: ApiModulesGlobal = {
    register(path, module) {
      cache.set(path, module);
    },
  };

  Reflect.defineProperty((globalThis as any).Quilt, 'ApiModules', {
    writable: false,
    configurable: true,
    enumerable: true,
    value: ApiModules,
  });
}
