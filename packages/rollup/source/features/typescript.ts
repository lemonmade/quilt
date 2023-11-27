import * as path from 'path';
import * as fs from 'fs';

export async function tsconfigAliases({
  root = process.cwd(),
}: {root?: string} = {}) {
  const [{default: alias}, tsconfig] = await Promise.all([
    import('@rollup/plugin-alias'),
    getTSConfig(root),
  ]);

  const tsconfigPaths = tsconfig?.compilerOptions?.paths;

  if (tsconfigPaths == null) return undefined;

  return alias({
    entries: Object.entries(tsconfigPaths).map(([name, aliases]) => {
      return {
        find: name.includes('*')
          ? new RegExp(`^${name.replace(/\*/, '(.*)')}$`)
          : name,
        replacement: path.resolve(root, aliases[0]!.replace('*', '$1')),
      };
    }),
  });
}

interface TSConfig {
  compilerOptions?: {paths?: Record<string, string[]>};
  references?: [{path: string}];
}

async function getTSConfig(root: string) {
  const tsconfigPath = path.join(root, 'tsconfig.json');

  if (!fs.existsSync(tsconfigPath)) {
    return undefined;
  }

  try {
    const tsconfig = JSON.parse(
      await fs.promises.readFile(tsconfigPath, 'utf8'),
    ) as TSConfig;

    return tsconfig;
  } catch {
    // intentional noop
  }
}
