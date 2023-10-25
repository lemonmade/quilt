- [ ] Add GraphQL support for testing
- [ ] Add `tsx` (or similar) for running scripts
- [ ] Add GraphQL type generation
- [ ] Add executable creation
- [ ] Multi browser builds, priority of asset manifests
- [ ] Improve Node bundle
- [ ] CJS build?
- [x] Fix request router entries
- [ ] Support CF/ Deno/ general overrides
- [ ] Add support for serving assets to default server in Node
- [ ] Add development stuff
- [ ] ESNext target consumption
- [ ] Make sure in-repo packages are aliased for dev, test, and build
- [ ] Add support for non-ESM server
- [ ] Service stuff
- [ ] App polyfills
- [ ] Add back Preact aliasing
- [ ] Automatic detection of node engines

  ```js
  if (useNodeTarget) {
    const engines: {node?: string} | undefined =
      (project.packageJson?.raw.engines as any) ??
      (workspace.packageJson?.raw.engines as any);

    const nodeSemver = engines?.node;

    // If no node engine is specified, we will use the current version of
    // node, which we assume you are setting as your minimum supported
    // target.
    if (nodeSemver == null) {
      targets.push('current node');
    } else {
      const {default: semver} = await import('semver');

      const parsed = semver.minVersion(nodeSemver);

      if (parsed == null) {
        throw new DiagnosticError({
          title: `Could not parse engines.node in order to determine the node target for project ${
            project.name
          }: ${JSON.stringify(nodeSemver)}`,
        });
      }

      targets.push(`node ${parsed.major}.${parsed.minor}`);
    }
  }
  ```

- Automatic setting of Rollup output format options based on targets

  ```js
  // caniuse-api does not have the data for Node, so reports all features to be
  // unsupported. In actuality, all LTS versions of Node support all the ES2015
  // features used by Rollup.
  if (targets.every((target) => target.includes('node'))) {
    generateOptions = {
      arrowFunctions: true,
      constBindings: true,
      objectShorthand: true,
      reservedNamesAsProps: true,
      symbols: true,
    };
  } else {
    const {isSupported} = await import('caniuse-api');
    const supportsES2015 = isSupported('es6', targets);

    generateOptions = {
      arrowFunctions: isSupported('arrow-functions', targets),
      constBindings: isSupported('const', targets),
      objectShorthand: supportsES2015,
      reservedNamesAsProps: supportsES2015,
      symbols: supportsES2015,
    };
  }

  return outputs.map((output) => {
    return {
      ...output,
      generatedCode: output.generatedCode ?? generateOptions,
    };
  });
  ```