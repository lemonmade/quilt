import {existsSync} from 'fs';

export type PackageManager = 'npm' | 'yarn' | 'pnpm';

const VALID_PACKAGE_MANAGERS = new Set<PackageManager>(['npm', 'pnpm', 'yarn']);

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
