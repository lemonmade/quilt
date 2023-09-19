import {existsSync} from 'fs';
import {execSync} from 'child_process';

export type PackageManager = 'npm' | 'yarn' | 'pnpm';

export interface PackageManagerRunner {
  readonly type: PackageManager;
  readonly commands: {
    run(command: string, ...args: string[]): string;
    install(...args: string[]): string;
  };
  install(): Promise<void>;
  run(command: string, args: string[]): Promise<void>;
}

const VALID_PACKAGE_MANAGERS = new Set<PackageManager>(['npm', 'pnpm', 'yarn']);

export function createPackageManagerRunner(
  type: PackageManager,
  {root = process.cwd()}: {root?: string} = {},
): PackageManagerRunner {
  return {
    type,
    commands: {
      run(command, ...args) {
        return type === 'npm'
          ? `npm run ${command}${stringifyArgs(args)}`
          : `${type} ${command}${stringifyArgs(args)}`;
      },
      install(...args) {
        return `${type} install${stringifyArgs(args)}`;
      },
    },
    async install() {
      try {
        execSync(`corepack use ${type}@latest`);
      } catch {
        // intentional noop
      }

      execSync(`${type} install`, {cwd: root, stdio: 'inherit'});
    },
    async run(command, args) {
      execSync(`${type} ${command} ${args.join(' ')}`, {
        cwd: root,
        stdio: 'inherit',
      });
    },
  };
}

function stringifyArgs(args: any[]) {
  return args.length === 0 ? '' : ` ${args.join(' ')}`;
}

export async function getPackageManager(
  explicitPackageManager?: string,
): Promise<PackageManager | undefined> {
  if (explicitPackageManager) {
    const normalizedPackageManager =
      explicitPackageManager.toLowerCase() as any;

    return VALID_PACKAGE_MANAGERS.has(normalizedPackageManager)
      ? normalizedPackageManager
      : undefined;
  }

  const npmUserAgent = process.env['npm_config_user_agent'];

  if (npmUserAgent?.includes('pnpm') || existsSync('pnpm-lock.yaml')) {
    return 'pnpm';
  } else if (npmUserAgent?.includes('yarn') || existsSync('yarn.lock')) {
    return 'yarn';
  } else if (npmUserAgent?.includes('npm') || existsSync('package-lock.json')) {
    return 'npm';
  }
}
