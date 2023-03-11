module.exports = {
  plugins: ['stylelint-prettier'],
  extends: ['stylelint-config-recommended'],
  rules: {
    'prettier/prettier': true,
  },
  reportNeedlessDisables: true,
  reportInvalidScopeDisables: true,
};
