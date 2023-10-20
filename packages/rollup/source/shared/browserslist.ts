export type BrowserTargetSelection =
  | string[]
  | {
      name?: string;
      browsers?: string[];
    };

export async function getBrowserTargetDetails(
  targetSelection: BrowserTargetSelection = {},
  {root}: {root?: string} = {},
) {
  const targets = Array.isArray(targetSelection)
    ? {
        browsers: targetSelection,
      }
    : targetSelection;
  const targetBrowsers =
    targets.browsers ??
    (await (async () => {
      const {default: browserslist} = await import('browserslist');
      const config = browserslist.findConfig(root!);

      if (config == null) return ['defaults'];

      const targetName = targets.name ?? 'defaults';
      return config[targetName] ?? ['defaults'];
    })());

  const name = targets.name === 'defaults' ? 'default' : targets.name;

  return {name, browsers: targetBrowsers};
}
