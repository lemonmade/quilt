const proxy = new Proxy(
  {},
  {
    get(property) {
      return property;
    },
  },
);

module.exports = proxy;
