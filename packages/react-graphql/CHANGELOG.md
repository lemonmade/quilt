# @quilted/react-graphql

## 0.4.59

### Patch Changes

- [#612](https://github.com/lemonmade/quilt/pull/612) [`bc849bc7`](https://github.com/lemonmade/quilt/commit/bc849bc740318936656162fde851b784ed6ef78f) Thanks [@lemonmade](https://github.com/lemonmade)! - Simplify app template APIs

## 0.4.58

### Patch Changes

- [`1b1d7974`](https://github.com/lemonmade/quilt/commit/1b1d797490bc5a145add8a599b9303cc93003744) Thanks [@lemonmade](https://github.com/lemonmade)! - Added per-fetch setting of all GraphQL HTTP options, and added new settings for request `extensions` and `source`.

  By default, the operation source is sent in all HTTP requests: as the `query` parameter for `GET` requests, and as the `query` body field for `POST` requests. To accomplish "persisted" GraphQL queries, you may want to send only the hashed identifier of a GraphQL operation, rather than the entire source. You can disable sending the source for all GraphQL fetches by setting `source: false` when creating your `fetch()` function:

  ```ts
  // This all applies for createGraphQLHttpStreamingFetch, too
  import {createGraphQLHttpFetch} from '@quilted/graphql';

  // Importing `.graphql` files automatically generates hashed
  // identifiers for your operations. If you don’t use this feature,
  // you must pass the identifier yourself.
  import myQuery from './MyQuery.graphql';

  const fetch = createGraphQLHttpFetch({
    source: false,
    url: 'https://my-app.com/query',
  });

  const {data} = await fetch(myQuery);
  ```

  This isn’t typically useful unless you also communicate the operation’s hash identifier. Here’s an example showing how you could pass the identifier as an additional URL parameter:

  ```ts
  import {createGraphQLHttpFetch} from '@quilted/graphql';
  import myQuery from './MyQuery.graphql';

  const fetch = createGraphQLHttpFetch({
    source: false,
    url(operation) {
      const url = new URL('https://my-app.com/query');
      url.searchParams.set('id', operation.id);
      return url;
    },
  });

  const {data} = await fetch(myQuery);
  ```

  Here’s an alternative approach, which sends the operation using a GraphQL `extensions` field, according to Apollo’s [automatic persisted queries protocol](https://www.google.com/search?client=safari&rls=en&q=apollo+autoamtic+persisted+queries&ie=UTF-8&oe=UTF-8):

  ```ts
  import {createGraphQLHttpFetch} from '@quilted/graphql';
  import myQuery from './MyQuery.graphql';

  const fetch = createGraphQLHttpFetch({
    source: false,
    url: 'https://my-app.com/query',
    extensions(operation) {
      return {
        persistedQuery: {version: 1, sha256Hash: operation.id},
      };
    },
  });

  const {data} = await fetch(myQuery);
  ```

  These `source` and `extension` options can be set globally, as shown above, or per-fetch:

  ```ts
  import {createGraphQLHttpFetch} from '@quilted/graphql';
  import myQuery from './MyQuery.graphql';

  const fetch = createGraphQLHttpFetch({
    url: 'https://my-app.com/query',
  });

  const {data} = await fetch(myQuery, {
    source: false,
    extensions: {
      persistedQuery: {version: 1, sha256Hash: myQuery.id},
    },
  });
  ```

  You can also now set the `method`, `url`, and `headers` options per fetch. The example below shows how you can set the `method` to `GET` for a single GraphQL operation:

  ```ts
  import {createGraphQLHttpFetch} from '@quilted/graphql';

  const fetch = createGraphQLHttpFetch({
    url: 'https://my-app.com/query',
  });

  const {data} = await fetch(`{ me { name } }`, {
    // Default is POST, but this query will run as a GET
    method: 'GET',
  });
  ```

- Updated dependencies [[`1b1d7974`](https://github.com/lemonmade/quilt/commit/1b1d797490bc5a145add8a599b9303cc93003744)]:
  - @quilted/graphql@1.2.0

## 0.4.57

### Patch Changes

- [#571](https://github.com/lemonmade/quilt/pull/571) [`3bdd0dd3`](https://github.com/lemonmade/quilt/commit/3bdd0dd39654e64e52465c46aea95c7c06f2e1cb) Thanks [@lemonmade](https://github.com/lemonmade)! - Clean up GraphQL library for a V1

- Updated dependencies [[`3bdd0dd3`](https://github.com/lemonmade/quilt/commit/3bdd0dd39654e64e52465c46aea95c7c06f2e1cb), [`9122cbbc`](https://github.com/lemonmade/quilt/commit/9122cbbce965bf5b432027e0707b2d619857fa67)]:
  - @quilted/graphql@1.0.0
  - @quilted/useful-types@1.0.0

## 0.4.56

### Patch Changes

- [#560](https://github.com/lemonmade/quilt/pull/560) [`553ff0fd`](https://github.com/lemonmade/quilt/commit/553ff0fd5b58ea6e788ad84dd6301b13210face9) Thanks [@lemonmade](https://github.com/lemonmade)! - Add changeset

- Updated dependencies [[`553ff0fd`](https://github.com/lemonmade/quilt/commit/553ff0fd5b58ea6e788ad84dd6301b13210face9)]:
  - @quilted/graphql@0.6.0

## 0.4.55

### Patch Changes

- Updated dependencies [[`350d2074`](https://github.com/lemonmade/quilt/commit/350d2074917e22bfa77ccad6bdcfe2f0f83ceb21)]:
  - @quilted/graphql@0.5.0

## 0.4.54

### Patch Changes

- [`97812120`](https://github.com/lemonmade/quilt/commit/978121207c65a4450a8ca9e43d017c6425a315c3) Thanks [@lemonmade](https://github.com/lemonmade)! - Update Preact dependencies and fix some missing peer dependencies

## 0.4.53

### Patch Changes

- [#536](https://github.com/lemonmade/quilt/pull/536) [`cf6e2de1`](https://github.com/lemonmade/quilt/commit/cf6e2de186d8644fad9afcedda85c05002e909e1) Thanks [@lemonmade](https://github.com/lemonmade)! - Update to TypeScript 5.0

## 0.4.52

### Patch Changes

- [`76e88c75`](https://github.com/lemonmade/quilt/commit/76e88c75d89e194e084d879392fb7a718197ccdf) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix typings for GraphQL utilities and add dedicated quilt entrypoint

## 0.4.51

### Patch Changes

- [`55336251`](https://github.com/lemonmade/quilt/commit/5533625189999f06e5111a9acba14e001a9d847c) Thanks [@lemonmade](https://github.com/lemonmade)! - Clean up async APIs

## 0.4.50

### Patch Changes

- [`8f1d275b`](https://github.com/lemonmade/quilt/commit/8f1d275b6de0abbc6f61bcd5401555f6480eb474) Thanks [@lemonmade](https://github.com/lemonmade)! - Remove need for @babel/runtime peer dependency

## 0.4.49

### Patch Changes

- [#474](https://github.com/lemonmade/quilt/pull/474) [`8890fad8`](https://github.com/lemonmade/quilt/commit/8890fad8d04efa95b362f4beaefcdbd51e65ba04) Thanks [@lemonmade](https://github.com/lemonmade)! - Looser React version restrictions

## 0.4.48

### Patch Changes

- [`51482122`](https://github.com/lemonmade/quilt/commit/514821223b4d8eb9c5289265c7cd2b4ef0b2e8b3) Thanks [@lemonmade](https://github.com/lemonmade)! - Add a utility for creating optional context

## 0.4.47

### Patch Changes

- [`a12c3576`](https://github.com/lemonmade/quilt/commit/a12c357693b173461f51a35fb7efdd0a9267e471) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix more build issues

## 0.4.46

### Patch Changes

- [`0629288e`](https://github.com/lemonmade/quilt/commit/0629288ee4ba2e2ccfd73fbb216c3559e1a5c77e) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix missing package builds

## 0.4.45

### Patch Changes

- [#364](https://github.com/lemonmade/quilt/pull/364) [`4dc1808a`](https://github.com/lemonmade/quilt/commit/4dc1808a86d15e821b218b528617430cbd8b5b48) Thanks [@lemonmade](https://github.com/lemonmade)! - Update to simplified Quilt config

## 0.4.44

### Patch Changes

- [#359](https://github.com/lemonmade/quilt/pull/359) [`2eceac54`](https://github.com/lemonmade/quilt/commit/2eceac546fa3ee3e2c4d2887ab4a6a021acb52cd) Thanks [@lemonmade](https://github.com/lemonmade)! - Update TypeScript and ESLint to latest versions

## 0.4.43

### Patch Changes

- [#298](https://github.com/lemonmade/quilt/pull/298) [`86afb486`](https://github.com/lemonmade/quilt/commit/86afb486023848fba9daba81e98e3b0eeb0bfbb6) Thanks [@lemonmade](https://github.com/lemonmade)! - Simplify GraphQL libraries

## 0.4.42

### Patch Changes

- [`82c653fa`](https://github.com/lemonmade/quilt/commit/82c653fa56df16b5b3a1e6e82b9e12745b5de895) Thanks [@lemonmade](https://github.com/lemonmade)! - Add react-utilities package with useContext helper

* [#265](https://github.com/lemonmade/quilt/pull/265) [`6b523901`](https://github.com/lemonmade/quilt/commit/6b52390142a0d075d6ce75e014e45cb02f5c6d9a) Thanks [@lemonmade](https://github.com/lemonmade)! - Simpler AppContext component

* Updated dependencies [[`82c653fa`](https://github.com/lemonmade/quilt/commit/82c653fa56df16b5b3a1e6e82b9e12745b5de895)]:
  - @quilted/react-utilities@0.1.0

## 0.4.41

### Patch Changes

- [`e65f1b91`](https://github.com/lemonmade/quilt/commit/e65f1b91b378058f6a39028417066582e76faf2a) Thanks [@lemonmade](https://github.com/lemonmade)! - Re-export GraphQLResult type

## 0.4.40

### Patch Changes

- [`ea331646`](https://github.com/lemonmade/quilt/commit/ea3316461bc42fe799e402a5635dd118e4a7e4a0) Thanks [@lemonmade](https://github.com/lemonmade)! - Improve GraphQL fetch naming and type exports

## 0.4.39

### Patch Changes

- [`eb9f7d42`](https://github.com/lemonmade/quilt/commit/eb9f7d4271010a8edfd683d825e9d49cb8969c8e) Thanks [@lemonmade](https://github.com/lemonmade)! - Improve usefulness of GraphQL client

* [#241](https://github.com/lemonmade/quilt/pull/241) [`04555fea`](https://github.com/lemonmade/quilt/commit/04555fea5652c30b27f146e10003e32fa16d66e8) Thanks [@lemonmade](https://github.com/lemonmade)! - Add react-query GraphQL hooks

## 0.4.38

### Patch Changes

- [`78fe1682`](https://github.com/lemonmade/quilt/commit/78fe1682e3f258ffca719c7eaaeeac05031dfa80) Thanks [@lemonmade](https://github.com/lemonmade)! - Simplify craft and sewing-kit

## 0.4.37

### Patch Changes

- [`65db3731`](https://github.com/lemonmade/quilt/commit/65db37312192507643bafa672a29d8e63cce823f) Thanks [@lemonmade](https://github.com/lemonmade)! - Force another version bump

## 0.4.36

### Patch Changes

- [`0735184`](https://github.com/lemonmade/quilt/commit/073518430d0fcabab7a2db9c76f8a69dac1fdea5) Thanks [@lemonmade](https://github.com/lemonmade)! - Publish new latest versions

## 0.4.35

### Patch Changes

- [#203](https://github.com/lemonmade/quilt/pull/203) [`2a5063f`](https://github.com/lemonmade/quilt/commit/2a5063fe8e949eaa7829dd5685901b67a06c09c8) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix test files being included in TypeScript output

## 0.4.34

### Patch Changes

- [`937a890`](https://github.com/lemonmade/quilt/commit/937a89009924a7b1d9e2a102028efd97928396e3) Thanks [@lemonmade](https://github.com/lemonmade)! - Improve base TypeScript preset

## 0.4.33

### Patch Changes

- [`4d3d0fa`](https://github.com/lemonmade/quilt/commit/4d3d0fadd1dc4eedd88198506d4f05f446180430) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix some type errors

## 0.4.32

### Patch Changes

- [#185](https://github.com/lemonmade/quilt/pull/185) [`3b9a758`](https://github.com/lemonmade/quilt/commit/3b9a758c5703aa63b93a736e33f88a3bfa393fb8) Thanks [@lemonmade](https://github.com/lemonmade)! - Improve package entry declarations

## 0.4.31

### Patch Changes

- [`917ea19`](https://github.com/lemonmade/quilt/commit/917ea19edbd8ad210675b11ef7f2ebe0c33e0b3e) Thanks [@lemonmade](https://github.com/lemonmade)! - Fixed dependencies to support stricter pnpm-based project
