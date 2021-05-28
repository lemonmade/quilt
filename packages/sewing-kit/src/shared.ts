import type {WebApp, Service} from '@sewing-kit/plugins';
import type {BuildWebAppTargetOptions} from '@sewing-kit/hooks';

export async function getEntry(project: WebApp | Service) {
  const entries = project.entry
    ? await project.fs.glob(
        /\.\w+$/.test(project.entry) ? project.entry : `${project.entry}.*`,
      )
    : await project.fs.glob('index.*');

  if (entries.length === 0) {
    throw new Error(
      `No entry found for ${project.name} (${
        project.entry
          ? `entry from configuration file: ${project.entry}`
          : 'no entry'
      })`,
    );
  }

  return entries[0];
}

export function idFromTargetOptions(options: BuildWebAppTargetOptions) {
  return (
    Object.keys(options)
      .sort()
      .map((key) => {
        const value = (options as any)[key];

        switch (key as keyof typeof options) {
          case 'quiltAutoServer':
            return undefined;
          case 'browsers':
            return value;
          default: {
            if (typeof value === 'boolean') {
              return value ? key : `no-${key}`;
            }

            return value;
          }
        }
      })
      .filter(Boolean)
      .join('.') || 'default'
  );
}
