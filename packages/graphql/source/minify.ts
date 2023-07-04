/**
 * Minifies a GraphQL source string by removing comments, whitespace,
 * and other unnecessary characters.
 *
 * @example
 * minifyGraphQLSource(`
 *   # Fetches details about me.
 *   query MyQuery   { my { id, name } }
 * `);
 * // => 'query MyQuery{my{id,name}}'
 */
export function minifyGraphQLSource(source: string) {
  return source
    .replace(/#.*/g, '')
    .replace(/\\n/g, ' ')
    .replace(/\s\s+/g, ' ')
    .replace(/\s*({|}|\(|\)|\.|:|,)\s*/g, '$1');
}
