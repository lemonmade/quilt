import {createHash} from 'node:crypto';
import * as path from 'node:path';
import {tmpdir} from 'node:os';
import {mkdtemp, rm, writeFile} from 'node:fs/promises';

import {describe, it, expect} from 'vitest';

import {graphql, type GraphQLOptions} from '../graphql.ts';

const QUERY = `
  query Greeting($name: String) {
    greeting(name: $name)
  }
`;

const FRAGMENTS = `
  fragment PersonName on Person {
    name
  }
`;

describe('graphql()', () => {
  it('transforms a .graphql module into an operation with a hashed id and minified source', async () => {
    const operation = await transformGraphQLModule(QUERY);

    expect(operation).toMatchObject({
      type: 'query',
      name: 'Greeting',
      source: 'query Greeting($name:String){greeting(name:$name)}',
    });
    expect(operation.id).toBe(sha256(operation.source!));
  });

  describe('source', () => {
    it('omits the source from the transformed module when `source: false`', async () => {
      const operation = await transformGraphQLModule(QUERY, {source: false});

      expect(operation).toEqual({
        id: sha256('query Greeting($name:String){greeting(name:$name)}'),
        type: 'query',
        name: 'Greeting',
      });
    });

    it('produces the same operation id with and without the source', async () => {
      const [withSource, withoutSource] = await Promise.all([
        transformGraphQLModule(QUERY),
        transformGraphQLModule(QUERY, {source: false}),
      ]);

      expect(withoutSource.id).toBe(withSource.id);
    });

    it('keeps the source of fragment-only documents', async () => {
      const operation = await transformGraphQLModule(FRAGMENTS, {
        source: false,
      });

      expect(operation.source).toBe('fragment PersonName on Person{name}');
    });

    it('keeps the full operation, including its source, in the module meta used for the manifest', async () => {
      const {meta} = await transformGraphQL(QUERY, {
        source: false,
        manifest: true,
      });

      expect(meta?.quilt?.graphql).toMatchObject({
        name: 'Greeting',
        source: 'query Greeting($name:String){greeting(name:$name)}',
      });
    });

    it('resolves #import-ed fragments before omitting the source', async () => {
      const directory = await mkdtemp(path.join(tmpdir(), 'quilt-graphql-'));

      try {
        await writeFile(
          path.join(directory, 'PersonNameFragment.graphql'),
          FRAGMENTS,
        );

        // `#import` comments must start at the beginning of a line.
        const operationSource = [
          '#import "./PersonNameFragment.graphql"',
          '',
          'query Person {',
          '  person {',
          '    ...PersonName',
          '  }',
          '}',
        ].join('\n');

        const [withSource, withoutSource] = await Promise.all([
          transformGraphQLModule(operationSource, undefined, {
            id: path.join(directory, 'PersonQuery.graphql'),
          }),
          transformGraphQLModule(
            operationSource,
            {source: false},
            {id: path.join(directory, 'PersonQuery.graphql')},
          ),
        ]);

        expect(withSource.source).toContain('fragment PersonName');
        expect(withoutSource).toEqual({
          id: withSource.id,
          type: 'query',
          name: 'Person',
        });
      } finally {
        await rm(directory, {recursive: true, force: true});
      }
    });
  });
});

interface TransformedOperation {
  id: string;
  type?: string;
  name?: string;
  source?: string;
}

async function transformGraphQL(
  code: string,
  options?: GraphQLOptions,
  {id = '/project/TestQuery.graphql'}: {id?: string} = {},
) {
  const plugin = graphql(options);

  // A minimal stand-in for Rollup's transform plugin context: the hook only
  // uses `resolve()` and `addWatchFile()` (for `#import`-ed documents).
  const context = {
    async resolve(imported: string, importer: string) {
      return {id: path.resolve(path.dirname(importer), imported)};
    },
    addWatchFile() {},
  };

  const result = await (
    plugin.transform as unknown as (
      this: typeof context,
      code: string,
      id: string,
    ) => Promise<{
      code: string;
      meta?: {quilt?: {graphql?: TransformedOperation}};
    }>
  ).call(context, code, id);

  return result;
}

async function transformGraphQLModule(
  code: string,
  options?: GraphQLOptions,
  transformOptions?: {id?: string},
): Promise<TransformedOperation> {
  const result = await transformGraphQL(code, options, transformOptions);

  const serialized = result.code.match(
    /^export default JSON\.parse\((.*)\)$/s,
  )?.[1];

  if (serialized == null) {
    throw new Error(`Unexpected module content: ${result.code}`);
  }

  return JSON.parse(JSON.parse(serialized));
}

function sha256(content: string) {
  return createHash('sha256').update(content).digest('hex');
}
