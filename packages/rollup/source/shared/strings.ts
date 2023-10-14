export function multiline(strings: TemplateStringsArray, ...values: any[]) {
  let result = strings.reduce(
    (combined, string, index) => `${combined}${string}${values[index] ?? ''}`,
    '',
  );

  // Inspired by https://github.com/zspecza/common-tags/blob/master/src/stripIndentTransformer/stripIndentTransformer.js#L8
  const match = result.match(/^[^\S\n]*(?=\S)/gm);
  const indent = match && Math.min(...match.map((indent) => indent.length));

  if (indent) {
    const regexp = new RegExp(`^.{${indent}}`, 'gm');
    result = result.replace(regexp, '');
  }

  return result.trim();
}
