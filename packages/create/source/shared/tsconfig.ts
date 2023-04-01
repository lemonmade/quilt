import {relative} from 'path';

import {
  format,
  relativeDirectoryForDisplay,
  type OutputTarget,
} from '../shared.ts';

interface TSConfigReference {
  path: string;
}

const ENDS_WITH_TSCONFIG = /[/]?tsconfig[.a-z0-9]*[.]json/i;

export async function addToTsConfig(directory: string, output: OutputTarget) {
  const tsconfig = JSON.parse(await output.read('tsconfig.json'));

  tsconfig.references ??= [];

  const relativePath = relative(output.root, directory);
  const relativeForDisplay = relativeDirectoryForDisplay(relativePath);

  if (tsconfig.references.length === 0) {
    tsconfig.references.push({path: relativeForDisplay});
  } else {
    let hasExistingReference = false;
    let referenceFormat:
      | 'relative'
      | 'pretty-relative'
      | 'tsconfig'
      | 'pretty-tsconfig' = 'pretty-relative';

    for (const {path} of tsconfig.references as TSConfigReference[]) {
      if (path.startsWith('./')) {
        if (ENDS_WITH_TSCONFIG.test(path)) {
          referenceFormat = 'pretty-tsconfig';

          if (path === `${relativeForDisplay}/tsconfig.json`) {
            hasExistingReference = true;
            break;
          }
        }

        referenceFormat = 'pretty-relative';

        if (path === relativeForDisplay) {
          hasExistingReference = true;
          break;
        }
      } else if (ENDS_WITH_TSCONFIG.test(path)) {
        referenceFormat = 'tsconfig';

        if (path === `${relativePath}/tsconfig.json`) {
          hasExistingReference = true;
          break;
        }
      } else {
        referenceFormat = 'relative';

        if (path === relativePath) {
          hasExistingReference = true;
          break;
        }
      }
    }

    if (!hasExistingReference) {
      let path: string;

      if (referenceFormat === 'pretty-tsconfig') {
        path = `${relativeForDisplay}/tsconfig.json`;
      } else if (referenceFormat === 'pretty-relative') {
        path = relativeForDisplay;
      } else if (referenceFormat === 'tsconfig') {
        path = `${relativePath}/tsconfig.json`;
      } else {
        path = relativePath;
      }

      tsconfig.references.push({path});
    }
  }

  tsconfig.references = tsconfig.references.sort(
    ({path: pathOne}: TSConfigReference, {path: pathTwo}: TSConfigReference) =>
      pathOne.localeCompare(pathTwo),
  );

  await output.write(
    'tsconfig.json',
    await format(JSON.stringify(tsconfig), {as: 'json'}),
  );
}
