import {type Configuration} from '@quilted/craft/graphql';

const configuration: Configuration = {
  schema: 'app/graphql/schema.graphql',
  documents: ['app/**/*.graphql'],
  extensions: {
    quilt: {
      schema: [{kind: 'definitions', outputPath: 'app/graphql/schema.ts'}],
    },
  },
};

export default configuration;
