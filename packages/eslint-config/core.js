module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:eslint-comments/recommended',
    'plugin:prettier/recommended',
  ],
  plugins: ['eslint-comments', 'prettier'],
  env: {
    es2021: true,
  },
  parserOptions: {
    sourceType: 'module',
  },
  rules: {
    'no-console': 'warn',
    'eslint-comments/no-unused-disable': 'error',
  },
  ignorePatterns: [
    'node_modules/',
    'build/',
    // Auto-generated GraphQL files
    '*.graphql.d.ts',
    '*.graphql.ts',
  ],
  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      parser: '@typescript-eslint/parser',
      extends: ['plugin:@typescript-eslint/recommended'],
      rules: {
        // I mean, it would be nice, but...
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
        // We think inference is fine in most cases.
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        // We will let TypeScript catch these for us
        '@typescript-eslint/no-unused-vars': 'off',
        // We prefer interfaces generally, and sometimes you use empty
        // interfaces because you have your own type that currently matches
        // another type, but may have additional properties in the future
        // (e.g., `export interface Options extends OtherOptions {}`). This
        // pattern is also sometimes useful for module augmentations, which
        // @quilt/sewing-kit and associated plugins use heavily.
        '@typescript-eslint/no-empty-interface': 'off',
        // Prefer primitive, descriptive types
        '@typescript-eslint/ban-types': [
          'error',
          {
            types: {
              String: {message: 'Use string instead', fixWith: 'string'},
              Boolean: {message: 'Use boolean instead', fixWith: 'boolean'},
              Number: {message: 'Use number instead', fixWith: 'number'},
              Object: {message: 'Use object instead', fixWith: 'object'},
              Array: {message: 'Provide a more specific type'},
              ReadonlyArray: {message: 'Provide a more specific type'},
            },
          },
        ],
        // Enforce camelCase naming convention and PascalCase class and interface names
        '@typescript-eslint/naming-convention': [
          'error',
          {
            selector: 'default',
            format: ['camelCase', 'PascalCase', 'UPPER_CASE'],
            leadingUnderscore: 'allowSingleOrDouble',
            trailingUnderscore: 'allowSingleOrDouble',
          },
          {
            selector: 'typeLike',
            format: ['PascalCase'],
          },
          {
            selector: 'typeParameter',
            format: ['PascalCase'],
            leadingUnderscore: 'allow',
          },
          {
            selector: 'interface',
            format: ['PascalCase'],
          },
        ],
      },
    },
    {
      files: ['*.test.*'],
      plugins: ['jest'],
      extends: ['plugin:jest/recommended'],
      env: {
        node: true,
        jest: true,
      },
    },
  ],
};
