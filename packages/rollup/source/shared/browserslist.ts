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

  const browsers = browserslist(targetBrowsers);

  return {name: targets.name, browsers};
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
      browserslist('defaults and fully supports es6-module-dynamic-import'),
    );
  })();

  const esmBrowsers = await esmBrowserslist;

  return targets.every((target) => esmBrowsers.has(target));
}

const BROWSESLIST_BROWSER_TO_MDN_BROWSER = new Map([
  ['and_chr', 'chrome_android'],
  ['and_ff', 'firefox_android'],
  ['android', 'webview_android'],
  ['chrome', 'chrome'],
  ['edge', 'edge'],
  ['edge_mob', 'edge_mobile'],
  ['firefox', 'firefox'],
  ['ie', 'ie'],
  ['ios_saf', 'safari_ios'],
  ['node', 'nodejs'],
  ['opera', 'opera'],
  ['safari', 'safari'],
  ['samsung', 'samsunginternet_android'],
]);

// Roughly adapted from https://github.com/webhintio/hint/blob/main/packages/utils-compat-data/src/browsers.ts
export async function rollupGenerateOptionsForBrowsers(
  browsers: readonly string[],
) {
  const [{default: semver}, {default: mdn}] = await Promise.all([
    import('semver'),
    import('@mdn/browser-compat-data', {
      assert: {type: 'json'},
      with: {type: 'json'},
    }) as Promise<any>,
  ]);

  const arrowFunctionsSupport =
    mdn.javascript.functions.arrow_functions.__compat.support;
  const constBindingsSupport = mdn.javascript.statements.const.__compat.support;
  const objectShorthandSupport =
    mdn.javascript.grammar.shorthand_object_literals.__compat.support;
  const symbolsSupport = mdn.javascript.builtins.Symbol.__compat.support;

  let arrowFunctions = true;
  let constBindings = true;
  let objectShorthand = true;
  let symbols = true;

  for (const {name, version} of mdnBrowserVersions(browsers, semver)) {
    arrowFunctions &&= isSupported(
      arrowFunctionsSupport,
      name,
      version,
      semver,
    );
    constBindings &&= isSupported(constBindingsSupport, name, version, semver);
    objectShorthand &&= isSupported(
      objectShorthandSupport,
      name,
      version,
      semver,
    );
    symbols &&= isSupported(symbolsSupport, name, version, semver);
  }

  return {
    preset: 'es2015',
    arrowFunctions,
    constBindings,
    objectShorthand,
    reservedNamesAsProps: objectShorthand,
    symbols,
  } satisfies import('rollup').GeneratedCodeOptions;
}

export async function targetsSupportModuleWebWorkers(
  browsers: readonly string[],
) {
  const [{default: semver}, {default: mdn}] = await Promise.all([
    import('semver'),
    import('@mdn/browser-compat-data', {
      assert: {type: 'json'},
      with: {type: 'json'},
    }) as Promise<any>,
  ]);

  const workerModulesSupport =
    mdn.api.Worker.Worker.ecmascript_modules.__compat.support;

  return [...mdnBrowserVersions(browsers, semver)].every(({name, version}) =>
    isSupported(workerModulesSupport, name, version, semver),
  );
}

function* mdnBrowserVersions(
  browsers: readonly string[],
  semver: Pick<typeof import('semver'), 'coerce'>,
) {
  for (const browser of browsers) {
    const [name, version] = browser.split(' ');

    const mdnBrowser = BROWSESLIST_BROWSER_TO_MDN_BROWSER.get(name!);
    if (mdnBrowser == null) continue;

    const semverVersion = semver.coerce(version);
    if (semverVersion == null) continue;

    yield {name: mdnBrowser, version: semverVersion};
  }
}

function isSupported(
  supportList: unknown,
  browser: string,
  version: import('semver').SemVer,
  semver: Pick<typeof import('semver'), 'coerce' | 'gte'>,
) {
  const supportedVersionDetails = (supportList as any)[browser];
  if (supportedVersionDetails == null) return false;

  const supportedVersion = semver.coerce(supportedVersionDetails.version_added);
  if (supportedVersion == null) return false;

  return semver.gte(version, supportedVersion);
}
