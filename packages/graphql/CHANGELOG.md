# @quilted/graphql

## 3.0.4

### Patch Changes

- [`cbbb036`](https://github.com/lemonmade/quilt/commit/cbbb0368b15a54badbeeace02a1c58baa9a2695f) Thanks [@lemonmade](https://github.com/lemonmade)! - Remove accidental debugging code

## 3.0.3

### Patch Changes

- [#716](https://github.com/lemonmade/quilt/pull/716) [`7daafca`](https://github.com/lemonmade/quilt/commit/7daafca900b3d9ea66be179394eadf7998cc94be) Thanks [@lemonmade](https://github.com/lemonmade)! - Refactor browser APIs

## 3.0.2

### Patch Changes

- [#714](https://github.com/lemonmade/quilt/pull/714) [`d4bda43`](https://github.com/lemonmade/quilt/commit/d4bda430900d0e4afd5ccecb04abe9ac81245486) Thanks [@lemonmade](https://github.com/lemonmade)! - Update GraphQL dependencies

## 3.0.1

### Patch Changes

- [`605d2d3a`](https://github.com/lemonmade/quilt/commit/605d2d3aa8536b29386f59d1e15597b4b2f0c507) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix `buildSchema` utility import from GraphQL

## 3.0.0

### Major Changes

- [#645](https://github.com/lemonmade/quilt/pull/645) [`302ed847`](https://github.com/lemonmade/quilt/commit/302ed8479f9c035ef39d48137de958dba50690ca) Thanks [@lemonmade](https://github.com/lemonmade)! - Removed CommonJS support

  The `require` export condition is no longer provided by any package. Quilt only supports ESModules, so if you need to use the CommonJS version, you will need to pre-process Quilt’s output code on your own.

- [`5d346a24`](https://github.com/lemonmade/quilt/commit/5d346a240ca95592c8623560ab1721935d6df1fa) Thanks [@lemonmade](https://github.com/lemonmade)! - Renamed `GraphQLFetch` function types to `GraphQLRun` to simplify HTTP GraphQL APIs

## 2.0.2

### Patch Changes

- [`2459cee9`](https://github.com/lemonmade/quilt/commit/2459cee90ec7d0c06b8d5da65601f1f0b3cb9799) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix return types for HTTP GraphQL fetch helpers

## 2.0.1

### Patch Changes

- [`d6ddf1ca`](https://github.com/lemonmade/quilt/commit/d6ddf1cae491d35f86a4c07fcde40f05d60a79f5) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix `url` being required on individual HTTP-fetched operations

## 2.0.0

### Major Changes

- [`055ffe19`](https://github.com/lemonmade/quilt/commit/055ffe19fdfde694d24f700d8cd8c7636491556a) Thanks [@lemonmade](https://github.com/lemonmade)! - Rename GraphQL HTTP fetch functions

  The `createGraphQLHttpFetch()` function has been renamed to `createGraphQLFetchOverHTTP()`, and the `createGraphQLHttpStreamingFetch()` function has been renamed to `createGraphQLStreamingFetchOverHTTP()`. Their supporting `Options` and `Context` types have also been updated with matching names.

  ```ts
  import {
    createGraphQLHttpFetch,
    type GraphQLHttpFetchOptions,
  } from '@quilted/graphql';

  // becomes:

  import {
    createGraphQLFetchOverHTTP,
    type GraphQLFetchOverHTTPOptions,
  } from '@quilted/graphql';
  ```

  This change is being made as part of a larger effort to use uppercase letters for acronyms and initialisms.

- [`055ffe19`](https://github.com/lemonmade/quilt/commit/055ffe19fdfde694d24f700d8cd8c7636491556a) Thanks [@{id:](https://github.com/{id:), [@{id:](https://github.com/{id:), [@{id:](https://github.com/{id:)! - Simplify `GraphQLFetch` type and separate HTTP options

  The `GraphQLFetch` and `GraphQLStreamingFetch` types previous had the assumption of an HTTP transport baked into their options. This made it awkward to use in other contexts, like a directly-callable function.

  To fix this issue, we’ve simplified the `GraphQLFetch` and `GraphQLStreamingFetch` types so that they only accept options universal to all transports: `variables`, for the operation variables, and `signal`, for an optional `AbortSignal` that should cancel the request. The previous HTTP-specific options have been moved to new `GraphQLFetchOverHTTPOptions` and `GraphQLStreamingFetchOverHTTPOptions` types. The `GraphQLFetch` function was also made a little more strict (requiring it to return a `Promise` for a GraphQL result).

  Additionally, the extendable `GraphQLFetchContext` type has been removed from this library. This type could previously be extended to declare additional context that would be optionally available in a GraphQL fetch function:

  ```ts
  import type {GraphQLFetch} from '@quilted/graphql';

  // A "module augmentation" that tells TypeScript
  // a `user` field is required
  declare module '@quilted/graphql' {
    interface GraphQLFetchContext {
   string};
    }
  }

  const fetch: GraphQLFetch = async (operation, {variables}, context) => {
    // `user` is available because of our module augmentation
    const user = context?.user;

    // ... do something with the user and return a result
  };

  const result = await fetch('query { message }', {}, {user: {id: '123'}});
  ```

  This type was removed in favor of a new `Context` generic on the `GraphQLFetch` and `GraphQLStreamingFetch` types. These allow you to define the types of any additional context you need for your GraphQL fetcher explicitly, without a module augmentation:

  ```ts
  import type {GraphQLFetch} from '@quilted/graphql';

  // A "module augmentation" that tells TypeScript
  // a `user` field is required
  declare module '@quilted/graphql' {
    interface GraphQLFetchContext {
   string};
    }
  }

  const fetch: GraphQLFetch<{
   string};
  }> = async (operation, {variables}, context) => {
    // `user` is available because of our module augmentation
    const user = context?.user;

    // ... do something with the user and return a result
  };

  const result = await fetch('query { message }', {}, {user: {id: '123'}});
  ```

  Finally, the `GraphQLVariableOptions` has been simplified. It no longer requires that variables be defined if there are non-nullable variables for the operation. This bit of type safety was very nice, but it was hard to build on top of the `GraphQLVariableOptions` type because of the advanced TypeScript features this type previously used. The new type is a simpler interface that is easy to extend.

### Minor Changes

- [`772fd3d1`](https://github.com/lemonmade/quilt/commit/772fd3d1ae845cf990c7b6c1fef0d92669dea660) Thanks [@lemonmade](https://github.com/lemonmade)! - Add `operationName` option to `GraphQLFetch` types

## 1.3.0

### Minor Changes

- [`3a97053a`](https://github.com/lemonmade/quilt/commit/3a97053a0be2099910fe4e06d55d04461aff0234) Thanks [@lemonmade](https://github.com/lemonmade)! - Add `toGraphQLSource()` helper, and re-export it and `toGraphQLOperation()` from more entrypoints

## 1.2.4

### Patch Changes

- [`91e5338f`](https://github.com/lemonmade/quilt/commit/91e5338f55c4249664c2cf679a0d077be46fae94) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix `@quilted/graphql/testing` expectation type signatures

- [`75088d17`](https://github.com/lemonmade/quilt/commit/75088d17c01549f77e6ff6e30605f749c142663f) Thanks [@lemonmade](https://github.com/lemonmade)! - Simplify GraphQL `VariableOptions` type

## 1.2.3

### Patch Changes

- [#612](https://github.com/lemonmade/quilt/pull/612) [`bc849bc7`](https://github.com/lemonmade/quilt/commit/bc849bc740318936656162fde851b784ed6ef78f) Thanks [@lemonmade](https://github.com/lemonmade)! - Simplify app template APIs

## 1.2.2

### Patch Changes

- [`199efb69`](https://github.com/lemonmade/quilt/commit/199efb69212fbf0195438f2d8a05def3a7ed044c) Thanks [@lemonmade](https://github.com/lemonmade)! - Correct first GET URL construction fix

## 1.2.1

### Patch Changes

- [`e5a9f67e`](https://github.com/lemonmade/quilt/commit/e5a9f67e018ba197f0e8d72d8044f5e1b91c0998) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix GET URL construction

## 1.2.0

### Minor Changes

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

## 1.1.0

### Minor Changes

- [`e121e639`](https://github.com/lemonmade/quilt/commit/e121e639fb656ddf14e3e47de87d347f38edae7f) Thanks [@lemonmade](https://github.com/lemonmade)! - Allow passing a custom `fetch()` to GraphQL fetchers

## 1.0.1

### Patch Changes

- [`d7c46287`](https://github.com/lemonmade/quilt/commit/d7c46287fd02ad3519723774781df8d096f268e1) Thanks [@lemonmade](https://github.com/lemonmade)! - Allow GraphQL fetch to take undefined `method` option

## 1.0.0

### Major Changes

- [#571](https://github.com/lemonmade/quilt/pull/571) [`3bdd0dd3`](https://github.com/lemonmade/quilt/commit/3bdd0dd39654e64e52465c46aea95c7c06f2e1cb) Thanks [@lemonmade](https://github.com/lemonmade)! - Clean up GraphQL library for a V1

### Patch Changes

- Updated dependencies [[`9122cbbc`](https://github.com/lemonmade/quilt/commit/9122cbbce965bf5b432027e0707b2d619857fa67)]:
  - @quilted/useful-types@1.0.0

## 0.6.6

### Patch Changes

- [`cc688ff9`](https://github.com/lemonmade/quilt/commit/cc688ff9a67261705500b7ec2081169a072eef0a) Thanks [@lemonmade](https://github.com/lemonmade)! - Support GraphQL over GET

## 0.6.5

### Patch Changes

- [`839c33f6`](https://github.com/lemonmade/quilt/commit/839c33f6d22a5db0d97989e8c6ef9fa049698182) Thanks [@lemonmade](https://github.com/lemonmade)! - Random assortment of other dependency updates

## 0.6.4

### Patch Changes

- [`4707ac31`](https://github.com/lemonmade/quilt/commit/4707ac31e47ab57947f9f2af005a21aaac105628) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix finishing iterable on thrown error

## 0.6.3

### Patch Changes

- [`7baeec0e`](https://github.com/lemonmade/quilt/commit/7baeec0ec8b9ca85dba0431802701475530fb6fc) Thanks [@lemonmade](https://github.com/lemonmade)! - Add initial streaming fetch support

## 0.6.2

### Patch Changes

- [`409fa00f`](https://github.com/lemonmade/quilt/commit/409fa00ffd0436dda34d22a658d4c843a606709b) Thanks [@lemonmade](https://github.com/lemonmade)! - Store GraphQL variables

## 0.6.1

### Patch Changes

- [`f86b689c`](https://github.com/lemonmade/quilt/commit/f86b689c7f5b9f7c6a280ad8c38c77437f0c4656) Thanks [@lemonmade](https://github.com/lemonmade)! - Improve GraphQL operation construction

- [`e167b740`](https://github.com/lemonmade/quilt/commit/e167b740b33f3bdcd6c3237a18c70b1f0138111b) Thanks [@lemonmade](https://github.com/lemonmade)! - Add helper for creating GraphQL operations

## 0.6.0

### Minor Changes

- [#560](https://github.com/lemonmade/quilt/pull/560) [`553ff0fd`](https://github.com/lemonmade/quilt/commit/553ff0fd5b58ea6e788ad84dd6301b13210face9) Thanks [@lemonmade](https://github.com/lemonmade)! - Add changeset

## 0.5.2

### Patch Changes

- [`26f85af8`](https://github.com/lemonmade/quilt/commit/26f85af81e17f7206811043050ccaaa7e308aa9a) Thanks [@lemonmade](https://github.com/lemonmade)! - Modernize some GraphQL types and clean up package exports

## 0.5.1

### Patch Changes

- [`2b810f91`](https://github.com/lemonmade/quilt/commit/2b810f91dab9a1c30c06d40c0e8018d59ecb77b3) Thanks [@lemonmade](https://github.com/lemonmade)! - Support DocumentNodes in GraphQL fetch()

## 0.5.0

### Minor Changes

- [`350d2074`](https://github.com/lemonmade/quilt/commit/350d2074917e22bfa77ccad6bdcfe2f0f83ceb21) Thanks [@lemonmade](https://github.com/lemonmade)! - Improve GraphQL types and HTTP fetch utility

## 0.4.61

### Patch Changes

- [`147f7984`](https://github.com/lemonmade/quilt/commit/147f798467b77b39b92b833efaeb8511bba0a6b7) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix duplicate custom scalar exports

## 0.4.60

### Patch Changes

- [`2f187348`](https://github.com/lemonmade/quilt/commit/2f1873489b508bf4333739e784d0f2139bdb33ed) Thanks [@lemonmade](https://github.com/lemonmade)! - Allow omiting custom scalar name when it matches the type name

- [`69402e99`](https://github.com/lemonmade/quilt/commit/69402e99ed3a8f4a08e3f4c948d8c8539de39812) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix custom scalar type generation

## 0.4.59

### Patch Changes

- [`7c4c416d`](https://github.com/lemonmade/quilt/commit/7c4c416d86624d24678485e6b6254bbbf73f203b) Thanks [@lemonmade](https://github.com/lemonmade)! - Support passing document source to simpleDocument

## 0.4.58

### Patch Changes

- [`8fac6a8d`](https://github.com/lemonmade/quilt/commit/8fac6a8d089dad2905ab9d4e1192d96b628a48eb) Thanks [@lemonmade](https://github.com/lemonmade)! - Simplify GraphQLVariableOptions type

## 0.4.57

### Patch Changes

- [#536](https://github.com/lemonmade/quilt/pull/536) [`cf6e2de1`](https://github.com/lemonmade/quilt/commit/cf6e2de186d8644fad9afcedda85c05002e909e1) Thanks [@lemonmade](https://github.com/lemonmade)! - Update to TypeScript 5.0

## 0.4.56

### Patch Changes

- [`59f08f2f`](https://github.com/lemonmade/quilt/commit/59f08f2f2ec344cb438b764e34fe62f8b0d40ebd) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix rollup plugin duplicate fragment imports

## 0.4.55

### Patch Changes

- [`be817feb`](https://github.com/lemonmade/quilt/commit/be817feb777fd056b3e868f62a2359df8c1d9e37) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix unnexpected files getting built by GraphQL type generator

## 0.4.54

### Patch Changes

- [`7978e6eb`](https://github.com/lemonmade/quilt/commit/7978e6eb62978b4ea970ceb4683d9f0a64040912) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix return value of GraphQL controller fetch

- [`7978e6eb`](https://github.com/lemonmade/quilt/commit/7978e6eb62978b4ea970ceb4683d9f0a64040912) Thanks [@lemonmade](https://github.com/lemonmade)! - Clean up schema type generation

## 0.4.53

### Patch Changes

- [`8dedbf8b`](https://github.com/lemonmade/quilt/commit/8dedbf8b263347577c534a57658de748387cb9c7) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix GraphQL test issues

## 0.4.52

### Patch Changes

- [`76e88c75`](https://github.com/lemonmade/quilt/commit/76e88c75d89e194e084d879392fb7a718197ccdf) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix typings for GraphQL utilities and add dedicated quilt entrypoint

## 0.4.51

### Patch Changes

- [`8f1d275b`](https://github.com/lemonmade/quilt/commit/8f1d275b6de0abbc6f61bcd5401555f6480eb474) Thanks [@lemonmade](https://github.com/lemonmade)! - Remove need for @babel/runtime peer dependency

## 0.4.50

### Patch Changes

- [`18edaf58`](https://github.com/lemonmade/quilt/commit/18edaf58aa66a8a138cbd36040d70cba373ccd6f) Thanks [@lemonmade](https://github.com/lemonmade)! - Improve GraphQL types

## 0.4.49

### Patch Changes

- [#429](https://github.com/lemonmade/quilt/pull/429) [`69a5d2a1`](https://github.com/lemonmade/quilt/commit/69a5d2a1f9c2fe8d93be3157eb33506b0b8f7df7) Thanks [@lemonmade](https://github.com/lemonmade)! - Update all development dependencies to their latest versions

## 0.4.48

### Patch Changes

- [`734f60c8`](https://github.com/lemonmade/quilt/commit/734f60c8d94eb692d5e641392feeff3c20a9f29d) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix GraphQL schema types with simple projects

* [`5e64e711`](https://github.com/lemonmade/quilt/commit/5e64e711c881c2969e08f40be72f50352449fa6a) Thanks [@lemonmade](https://github.com/lemonmade)! - Add GraphQL schema output type

## 0.4.47

### Patch Changes

- [`b31472f4`](https://github.com/lemonmade/quilt/commit/b31472f45a3928f34163343351e5356312dffd67) Thanks [@lemonmade](https://github.com/lemonmade)! - Slightly better debugging of GraphQL type errors

## 0.4.46

### Patch Changes

- [`aeb9655b`](https://github.com/lemonmade/quilt/commit/aeb9655bccdcaea6a1474b7a53c70353ceda3af6) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix fragment-only GraphQL documents

## 0.4.45

### Patch Changes

- [`c5d05da9`](https://github.com/lemonmade/quilt/commit/c5d05da920c329191c90fe8aa2654958ec14293f) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix cross-platform node options for executables

## 0.4.44

### Patch Changes

- [`3e5cae74`](https://github.com/lemonmade/quilt/commit/3e5cae74ff923636cfdb371ca722b1473c617aa2) Thanks [@lemonmade](https://github.com/lemonmade)! - Only generate schema input types when needed

* [`6b18de9e`](https://github.com/lemonmade/quilt/commit/6b18de9e4ade25668bc81f2f9e3dc96b1fd82615) Thanks [@lemonmade](https://github.com/lemonmade)! - Upgrade @graphql-tools/schema

## 0.4.43

### Patch Changes

- [#390](https://github.com/lemonmade/quilt/pull/390) [`15cf0022`](https://github.com/lemonmade/quilt/commit/15cf00222e8109d9076b4e90c438429628c86095) Thanks [@lemonmade](https://github.com/lemonmade)! - Switch from binary => executable

## 0.4.42

### Patch Changes

- [`a12c3576`](https://github.com/lemonmade/quilt/commit/a12c357693b173461f51a35fb7efdd0a9267e471) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix more build issues

## 0.4.41

### Patch Changes

- [`0629288e`](https://github.com/lemonmade/quilt/commit/0629288ee4ba2e2ccfd73fbb216c3559e1a5c77e) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix missing package builds

## 0.4.40

### Patch Changes

- [#364](https://github.com/lemonmade/quilt/pull/364) [`4dc1808a`](https://github.com/lemonmade/quilt/commit/4dc1808a86d15e821b218b528617430cbd8b5b48) Thanks [@lemonmade](https://github.com/lemonmade)! - Update to simplified Quilt config

## 0.4.39

### Patch Changes

- [#359](https://github.com/lemonmade/quilt/pull/359) [`2eceac54`](https://github.com/lemonmade/quilt/commit/2eceac546fa3ee3e2c4d2887ab4a6a021acb52cd) Thanks [@lemonmade](https://github.com/lemonmade)! - Update TypeScript and ESLint to latest versions

## 0.4.38

### Patch Changes

- [#331](https://github.com/lemonmade/quilt/pull/331) [`efc54f75`](https://github.com/lemonmade/quilt/commit/efc54f75cb29ec4143a8e52f577edff518014a6b) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix React types in stricter package managers

## 0.4.37

### Patch Changes

- [`fbf35f12`](https://github.com/lemonmade/quilt/commit/fbf35f12cc5fe3d1da976e7fcd47898051620979) Thanks [@lemonmade](https://github.com/lemonmade)! - Allow passing abort signal to GraphQL fetch

## 0.4.36

### Patch Changes

- [`4c8feaac`](https://github.com/lemonmade/quilt/commit/4c8feaac8e42be19fd65954436c55377dd50a1f6) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix unnecessary requiring of GraphQL variables

## 0.4.35

### Patch Changes

- [#298](https://github.com/lemonmade/quilt/pull/298) [`86afb486`](https://github.com/lemonmade/quilt/commit/86afb486023848fba9daba81e98e3b0eeb0bfbb6) Thanks [@lemonmade](https://github.com/lemonmade)! - Simplify GraphQL libraries

## 0.4.34

### Patch Changes

- [`8a8c878b`](https://github.com/lemonmade/quilt/commit/8a8c878bd8d5214b56af3381d28c1769820d84d7) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix GraphQL document type generation CLI

* [`ce7faaf8`](https://github.com/lemonmade/quilt/commit/ce7faaf8199e88a59a0fba8b1ac19943f8294867) Thanks [@lemonmade](https://github.com/lemonmade)! - Print `Schema` type for schema `outputType` outputs

## 0.4.33

### Patch Changes

- [`4c8ca274`](https://github.com/lemonmade/quilt/commit/4c8ca274fe5b42b12c06f516f55a93733dfce415) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix passing `undefined` as the credential to `fetch()`

## 0.4.32

### Patch Changes

- [`ea331646`](https://github.com/lemonmade/quilt/commit/ea3316461bc42fe799e402a5635dd118e4a7e4a0) Thanks [@lemonmade](https://github.com/lemonmade)! - Improve GraphQL fetch naming and type exports

## 0.4.31

### Patch Changes

- [`eb9f7d42`](https://github.com/lemonmade/quilt/commit/eb9f7d4271010a8edfd683d825e9d49cb8969c8e) Thanks [@lemonmade](https://github.com/lemonmade)! - Improve usefulness of GraphQL client

* [#241](https://github.com/lemonmade/quilt/pull/241) [`04555fea`](https://github.com/lemonmade/quilt/commit/04555fea5652c30b27f146e10003e32fa16d66e8) Thanks [@lemonmade](https://github.com/lemonmade)! - Add react-query GraphQL hooks

## 0.4.30

### Patch Changes

- [`f6d7ae01`](https://github.com/lemonmade/quilt/commit/f6d7ae011e259a30a145cf80205143031c8223dd) Thanks [@lemonmade](https://github.com/lemonmade)! - Allow passing raw GraphQL query/ mutation strings

## 0.4.29

### Patch Changes

- [#228](https://github.com/lemonmade/quilt/pull/228) [`c7afc048`](https://github.com/lemonmade/quilt/commit/c7afc0486d37bc54da704c46cda1166690dda152) Thanks [@lemonmade](https://github.com/lemonmade)! - Upgrade to stricter typescript options

## 0.4.28

### Patch Changes

- [`28168cd4`](https://github.com/lemonmade/quilt/commit/28168cd475c8ed1f325494128c86eaa44f676cbe) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix GraphQL types not being regenerated on file changes

## 0.4.27

### Patch Changes

- [`52b01c2e`](https://github.com/lemonmade/quilt/commit/52b01c2e2fca99df929ae095d1be2748609c604b) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix type generation in multi-GraphQL project repos

## 0.4.26

### Patch Changes

- [`1f8ffd53`](https://github.com/lemonmade/quilt/commit/1f8ffd53ba84f893dd44ab0879d825b4f783910c) Thanks [@lemonmade](https://github.com/lemonmade)! - Reduce peer dependency warnings

* [#223](https://github.com/lemonmade/quilt/pull/223) [`7041e6be`](https://github.com/lemonmade/quilt/commit/7041e6be1b602efd6348ff6b377f07cf57e43f3c) Thanks [@lemonmade](https://github.com/lemonmade)! - Simplified GraphQL file loading

## 0.4.25

### Patch Changes

- [`78fe1682`](https://github.com/lemonmade/quilt/commit/78fe1682e3f258ffca719c7eaaeeac05031dfa80) Thanks [@lemonmade](https://github.com/lemonmade)! - Simplify craft and sewing-kit

## 0.4.24

### Patch Changes

- [`65db3731`](https://github.com/lemonmade/quilt/commit/65db37312192507643bafa672a29d8e63cce823f) Thanks [@lemonmade](https://github.com/lemonmade)! - Force another version bump

- Updated dependencies [[`65db3731`](https://github.com/lemonmade/quilt/commit/65db37312192507643bafa672a29d8e63cce823f)]:
  - @quilted/sewing-kit@0.2.23
  - @quilted/sewing-kit-jest@0.1.15
  - @quilted/sewing-kit-rollup@0.1.14
  - @quilted/sewing-kit-vite@0.1.11

## 0.4.23

### Patch Changes

- [`0735184`](https://github.com/lemonmade/quilt/commit/073518430d0fcabab7a2db9c76f8a69dac1fdea5) Thanks [@lemonmade](https://github.com/lemonmade)! - Publish new latest versions

- Updated dependencies [[`0735184`](https://github.com/lemonmade/quilt/commit/073518430d0fcabab7a2db9c76f8a69dac1fdea5)]:
  - @quilted/sewing-kit@0.2.22
  - @quilted/sewing-kit-jest@0.1.14
  - @quilted/sewing-kit-rollup@0.1.13
  - @quilted/sewing-kit-vite@0.1.10

## 0.4.22

### Patch Changes

- [`71213d5`](https://github.com/lemonmade/quilt/commit/71213d53f9aa19f537d08bd66e7120d8437416a2) Thanks [@lemonmade](https://github.com/lemonmade)! - Improve GraphQL type generation for sewing-kit

## 0.4.21

### Patch Changes

- [#203](https://github.com/lemonmade/quilt/pull/203) [`2a5063f`](https://github.com/lemonmade/quilt/commit/2a5063fe8e949eaa7829dd5685901b67a06c09c8) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix test files being included in TypeScript output

- Updated dependencies [[`2a5063f`](https://github.com/lemonmade/quilt/commit/2a5063fe8e949eaa7829dd5685901b67a06c09c8)]:
  - @quilted/sewing-kit@0.2.20
  - @quilted/sewing-kit-jest@0.1.13
  - @quilted/sewing-kit-rollup@0.1.12
  - @quilted/sewing-kit-vite@0.1.9

## 0.4.20

### Patch Changes

- [`937a890`](https://github.com/lemonmade/quilt/commit/937a89009924a7b1d9e2a102028efd97928396e3) Thanks [@lemonmade](https://github.com/lemonmade)! - Improve base TypeScript preset

- Updated dependencies [[`937a890`](https://github.com/lemonmade/quilt/commit/937a89009924a7b1d9e2a102028efd97928396e3)]:
  - @quilted/sewing-kit@0.2.19
  - @quilted/sewing-kit-jest@0.1.12
  - @quilted/sewing-kit-rollup@0.1.11
  - @quilted/sewing-kit-vite@0.1.8

## 0.4.19

### Patch Changes

- [`4d3d0fa`](https://github.com/lemonmade/quilt/commit/4d3d0fadd1dc4eedd88198506d4f05f446180430) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix some type errors

## 0.4.18

### Patch Changes

- [#185](https://github.com/lemonmade/quilt/pull/185) [`3b9a758`](https://github.com/lemonmade/quilt/commit/3b9a758c5703aa63b93a736e33f88a3bfa393fb8) Thanks [@lemonmade](https://github.com/lemonmade)! - Improve package entry declarations

- Updated dependencies [[`3b9a758`](https://github.com/lemonmade/quilt/commit/3b9a758c5703aa63b93a736e33f88a3bfa393fb8)]:
  - @quilted/sewing-kit@0.2.18
  - @quilted/sewing-kit-jest@0.1.11
  - @quilted/sewing-kit-rollup@0.1.10
  - @quilted/sewing-kit-vite@0.1.7

## 0.4.17

### Patch Changes

- [`fc1e551`](https://github.com/lemonmade/quilt/commit/fc1e551b6996626d9da8a7466244bcd95fe89a85) Thanks [@lemonmade](https://github.com/lemonmade)! - Use @quilted/quilt in GraphQL types through Craft

- Updated dependencies [[`6b1acfd`](https://github.com/lemonmade/quilt/commit/6b1acfd562f6e268c004ab31cfdeaa065696ca88)]:
  - @quilted/sewing-kit@0.2.16

## 0.4.16

### Patch Changes

- [#181](https://github.com/lemonmade/quilt/pull/181) [`c82cafa`](https://github.com/lemonmade/quilt/commit/c82cafa796feaba7221baed984f7e720b5601a62) Thanks [@lemonmade](https://github.com/lemonmade)! - Improve GraphQL configuration types

* [#181](https://github.com/lemonmade/quilt/pull/181) [`c82cafa`](https://github.com/lemonmade/quilt/commit/c82cafa796feaba7221baed984f7e720b5601a62) Thanks [@lemonmade](https://github.com/lemonmade)! - Always generate schema input types

## 0.4.15

### Patch Changes

- [`917ea19`](https://github.com/lemonmade/quilt/commit/917ea19edbd8ad210675b11ef7f2ebe0c33e0b3e) Thanks [@lemonmade](https://github.com/lemonmade)! - Fixed dependencies to support stricter pnpm-based project

- Updated dependencies [[`917ea19`](https://github.com/lemonmade/quilt/commit/917ea19edbd8ad210675b11ef7f2ebe0c33e0b3e)]:
  - @quilted/sewing-kit@0.2.14
  - @quilted/sewing-kit-jest@0.1.9
  - @quilted/sewing-kit-rollup@0.1.8
  - @quilted/sewing-kit-vite@0.1.3
