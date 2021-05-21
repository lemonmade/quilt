import {join} from 'path';
import {readFileSync} from 'fs';
import {createHash} from 'crypto';

import type {Transformer} from '@jest/transform';
import {parse} from 'graphql';

import {extractImports} from './transform';

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
    const {imports, source} = extractImports(rawSource);

    const utilityImports = `
      var {print, parse} = require('graphql');
      var {cleanDocument, toSimpleDocument} = require(${JSON.stringify(
        join(__dirname, 'document.js'),
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

    return `
      ${utilityImports}
      ${importSource}

      var document = ${JSON.stringify(parse(source))};

      ${appendDefinitionsSource}

      module.exports = toSimpleDocument(cleanDocument(document, {removeUnused: false}));
    `;
  },
};

module.exports = transformer;
