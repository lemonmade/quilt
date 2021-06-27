import generate from '@babel/generator';

// This package has a legacy setup where it pretends to be an ES module,
// but when imported from an ES module in Node, the default export is
// a named `default` field on the default export instead. This file
// normalizes that value into something we can import normally.

const normalizedGenerate: typeof generate =
  typeof generate === 'function' ? generate : (generate as any).default;

export default normalizedGenerate;
