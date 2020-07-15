module.exports = {
  schema: 'schema.graphql',
  documents: 'documents/**/*.graphql',
  extensions: {
    quilt: {
      schemaTypes: [{types: 'input', outputPath: 'graphql/types'}],
    },
  },
};
