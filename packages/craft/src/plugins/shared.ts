import type {App, Service} from '@quilted/sewing-kit';

export async function getEntry(project: App | Service) {
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
