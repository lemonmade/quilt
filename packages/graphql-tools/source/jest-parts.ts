import {readFileSync} from 'fs';
import {createHash} from 'crypto';

import type {Transformer} from '@jest/transform';
import {parse} from 'graphql';

import {extractGraphQLImports} from './transform.ts';

const THIS_FILE = readFileSync(__filename);

const transformer: Transformer = {
  getCacheKey(fileData, filename) {
    return createHash('md5')
      .update(THIS_FILE)
      .update(fileData)
      .update(filename)
      .digest('hex');
  },
  process(rawSource) {
    const {imports, source} = extractGraphQLImports(rawSource);

    // This module only runs for Jest, which is CJS only, so we can use a global `require` here.
    const utilityImports = `
      var {print, parse} = require(${JSON.stringify(
        require.resolve('graphql'),
      )});
      var {cleanGraphQLDocument, toGraphQLOperation} = require(${JSON.stringify(
        require.resolve('./transform.cjs'),
      )});
    `;

    const importSource = imports
      .map(
        (imported, index) =>
          `var importedDocument${index} = require(${JSON.stringify(
            imported,
          )});`,
      )
      .join('\n');

    const appendDefinitionsSource = imports
      .map(
        (_, index) =>
          `document.definitions.push.apply(document.definitions, parse(importedDocument${index}.source).definitions);`,
      )
      .join('\n');

    return {
      code: `
        ${utilityImports}
        ${importSource}

        var document = ${JSON.stringify(parse(source))};

        ${appendDefinitionsSource}

        module.exports = toGraphQLOperation(cleanGraphQLDocument(document, {removeUnused: false}));
      `,
    };
  },
};

module.exports = transformer;
