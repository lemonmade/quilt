const path = require('path');

module.exports = {
  process(_, sourcePath) {
    return {
      code: `module.exports = ${JSON.stringify(
        `/assets/${path.basename(sourcePath)}`,
      )};`,
    };
  },
};
