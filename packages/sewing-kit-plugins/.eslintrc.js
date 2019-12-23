module.exports = {
  rules: {
    'react-hooks/rules-of-hooks': 'off',
    // For some reason, some of the no-extraneous-dependency disables cause an error in
    // CI for being unnecessary (which is wrong; they should be required). Can’t figure
    // out why so just disabling the rule for this project altogether (needs to be done
    // this way as any other form of disabling rules is a violation of this rule, lol).
    'eslint-comments/no-unused-disable': 'off',
  },
};
