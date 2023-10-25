export type BrowserGroupTargetSelection =
  | readonly string[]
  | {
      name?: string;
      browsers?: readonly string[];
    };

export async function getBrowserGroupTargetDetails(
  targetSelection: BrowserGroupTargetSelection = {},
  {root}: {root?: string} = {},
) {
  const {default: browserslist} = await import('browserslist');

  const targets: {
    name?: string;
    browsers?: readonly string[];
  } = (
    Array.isArray(targetSelection)
      ? {
          browsers: targetSelection,
        }
      : targetSelection
  ) as any;

  const targetBrowsers =
    targets.browsers ??
    (await (async () => {
      const config = await getBrowserGroups({root});
      const targetName = targets.name ?? 'default';
      return config[targetName] ?? ['defaults'];
    })());

  return {name: targets.name, browsers: browserslist(targetBrowsers)};
}

export interface BrowserGroups {
  default: readonly string[];
  [name: string]: readonly string[];
}

export async function getBrowserGroups({
  root = process.cwd(),
}: {root?: string} = {}): Promise<BrowserGroups> {
  const {default: browserslist} = await import('browserslist');
  const config = browserslist.findConfig(root);

  if (config == null) return {default: browserslist(['defaults'])};

  const {defaults, ...rest} = config;

  const browserGroups: BrowserGroups = {} as any;

  const groupsWithFullList = Object.entries(rest)
    .map(([name, browsers]) => ({
      name,
      browsers: browserslist(browsers),
    }))
    .sort((first, second) => first.browsers.length - second.browsers.length);

  for (const {name, browsers} of groupsWithFullList) {
    browserGroups[name] = browsers;
  }

  browserGroups.default = defaults;

  return browserGroups;
}

export async function getBrowserGroupRegularExpressions(
  groups?: BrowserGroups,
): Promise<Record<string, RegExp>> {
  const [{default: browserslist}, {getUserAgentRegex}] = await Promise.all([
    import('browserslist'),
    import('browserslist-useragent-regexp'),
  ]);

  // Expand the browserslist queries into the full list of supported browsers,
  // and sort by the number of browsers in each group (with the last item having
  // the largest browser support)
  const groupsWithFullList = Object.entries(
    groups ?? (await getBrowserGroups()),
  )
    .map(([name, browsers]) => ({
      name,
      browsers: browserslist(browsers),
    }))
    .sort((first, second) => first.browsers.length - second.browsers.length);

  if (groupsWithFullList.length === 0) return {};

  const lastGroup = groupsWithFullList.pop()!;

  const regexes: Record<string, RegExp> = {};

  for (const {name, browsers} of groupsWithFullList) {
    const regex = getUserAgentRegex({
      browsers,
      ignoreMinor: true,
      ignorePatch: true,
      allowHigherVersions: true,
    });

    regexes[name] = regex;
  }

  // The last group is the default group, so it should match everything
  regexes[lastGroup.name] = new RegExp('');

  return regexes;
}

let esmBrowserslist: Promise<Set<string>>;

export async function targetsSupportModules(targets: readonly string[]) {
  esmBrowserslist ??= (async () => {
    const {default: browserslist} = await import('browserslist');

    return new Set(
      browserslist(
        'defaults and fully supports es6-module and fully supports es6-module-dynamic-import',
      ),
    );
  })();

  const esmBrowsers = await esmBrowserslist;

  return targets.every((target) => esmBrowsers.has(target));
}
