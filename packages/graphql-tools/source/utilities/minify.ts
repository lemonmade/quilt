export function minifyGraphQLSource(source: string) {
  return source
    .replace(/#.*/g, '')
    .replace(/\\n/g, ' ')
    .replace(/\s\s+/g, ' ')
    .replace(/\s*({|}|\(|\)|\.|:|,)\s*/g, '$1');
}
