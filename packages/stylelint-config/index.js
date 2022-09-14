module.exports = {
  plugins: ['stylelint-prettier'],
  extends: ['stylelint-config-recommended', 'stylelint-config-prettier'],
  rules: {
    'prettier/prettier': true,
  },
  reportNeedlessDisables: true,
  reportInvalidScopeDisables: true,
};
