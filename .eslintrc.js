module.exports = {
  extends: [
    'plugin:@sewing-kit/typescript',
    'plugin:@sewing-kit/react',
    'plugin:@sewing-kit/prettier',
  ],
  ignorePatterns: [
    'node_modules/',
    'packages/*/build/',
    'packages/*/*.d.ts',
    'packages/*/*.js',
    '!packages/*/.eslintrc.js',
    'packages/*/*.mjs',
    'packages/*/*.node',
    'packages/*/*.esnext',
    'packages/**/tests/fixtures/',
    'packages/preact-mini-compat/',
  ],
  overrides: [
    {
      files: [
        'sewing-kit.config.ts',
        'config/sewing-kit.ts',
        '**/*.test.{ts,tsx}',
      ],
      rules: {
        'import/no-extraneous-dependencies': 'off',
      },
    },
  ],
  rules: {
    'lines-around-comment': 'off',
    // We use the jsx-runtime version of React
    'react/react-in-jsx-scope': 'off',
    // TypeScript does this better
    'import/named': 'off',
    // Needed a resolution to fix some TS 4.0 linting, these rules no longer exist
    '@typescript-eslint/ban-ts-ignore': 'off',
    '@typescript-eslint/camelcase': 'off',
    '@typescript-eslint/class-name-casing': 'off',
    // Buggy rules
    'babel/no-unused-expressions': 'off',
  },
};
