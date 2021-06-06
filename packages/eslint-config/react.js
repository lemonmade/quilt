module.exports = {
  extends: [
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
  ],
  plugins: ['react', 'react-hooks', 'jsx-a11y'],
  settings: {
    react: {
      version: 'detect',
    },
  },
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
  },
  rules: {
    // We use the jsx-runtime, which does not require React to be in scope.
    'react/react-in-jsx-scope': 'off',
    // This rule has a lot of falsy positives, and the common pattern within
    // quilt of using function declarations generally makes this a non-issue.
    'react/display-name': 'off',
    // TypeScript handles this for us.
    'react/prop-types': 'off',
    // This is generally a mistake, use a unique identifier instead.
    'react/no-array-index-key': 'warn',
  },
};
