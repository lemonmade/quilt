import {realpathSync} from 'fs';

import {Project, sourceEntriesForProject} from '../shared/project.ts';

export async function monorepoPackageAliases({
  root = process.cwd(),
}: {root?: string} = {}) {
  const project = Project.load(root);
  const seenDependencies = new Set<string>();
  const seenProjects = new Set<Project>();

  function processProject(project: Project) {
    const {dependencies, devDependencies} = project.packageJSON.raw;

    for (const pkg of Object.keys({...dependencies, ...devDependencies})) {
      if (seenDependencies.has(pkg)) continue;

      seenDependencies.add(pkg);

      let packageRoot: string | undefined;

      try {
        packageRoot = realpathSync(project.resolve('node_modules', pkg));
      } catch {
        // intentional noop
      }

      if (
        packageRoot == null ||
        packageRoot.includes('node_modules') ||
        packageRoot === root
      ) {
        continue;
      }

      const packageProject = Project.load(packageRoot);
      if (seenProjects.has(packageProject)) continue;

      seenProjects.add(packageProject);
      processProject(packageProject);
    }
  }

  processProject(project);

  const [{default: alias}, projectsWithEntries] = await Promise.all([
    import('@rollup/plugin-alias'),
    Promise.all(
      Array.from(seenProjects, async (project) => {
        const entries = await sourceEntriesForProject(project);
        return {project, entries};
      }),
    ),
  ]);

  const aliases: import('@rollup/plugin-alias').Alias[] = [];

  for (const {project, entries} of projectsWithEntries) {
    const {name} = project;

    for (const [entry, source] of Object.entries(entries)) {
      const entryName =
        entry === '.'
          ? name
          : `${name}/${entry.startsWith('./') ? entry.slice(2) : entry}`;

      aliases.push({
        find: new RegExp(`^${entryName}$`),
        replacement: source,
      });
    }
  }

  return alias({
    entries: aliases,
  });
}
