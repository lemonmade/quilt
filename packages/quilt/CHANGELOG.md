# @quilted/quilt

## 0.5.150

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

## 0.5.149

### Patch Changes

- [`c3f3298b`](https://github.com/lemonmade/quilt/commit/c3f3298b4458d939c0bfc7b83fe6ce120f4fbde8) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix missing `isThreadSignal()` utility

## 0.5.148

### Patch Changes

- [`00d90d10`](https://github.com/lemonmade/quilt/commit/00d90d10f4eb97fe55712adcc8b34aa3d3ec1aa1) Thanks [@lemonmade](https://github.com/lemonmade)! - Update signals dependency and add dedicated package for signal utilities

- [#588](https://github.com/lemonmade/quilt/pull/588) [`837c8677`](https://github.com/lemonmade/quilt/commit/837c8677566b7e6d182496e07e9c998fc6b7802d) Thanks [@lemonmade](https://github.com/lemonmade)! - Clean up threads for a first version

- [#587](https://github.com/lemonmade/quilt/pull/587) [`1180dde2`](https://github.com/lemonmade/quilt/commit/1180dde278793006b8ae153804130cad6dab36c2) Thanks [@lemonmade](https://github.com/lemonmade)! - First major version for `@quilted/events`

- [`e45f766b`](https://github.com/lemonmade/quilt/commit/e45f766bce9e8632fe17d9e9c2e3d446d0783feb) Thanks [@lemonmade](https://github.com/lemonmade)! - Simplify thread creation and add helpers for transferring signals over threads

- Updated dependencies [[`00d90d10`](https://github.com/lemonmade/quilt/commit/00d90d10f4eb97fe55712adcc8b34aa3d3ec1aa1), [`837c8677`](https://github.com/lemonmade/quilt/commit/837c8677566b7e6d182496e07e9c998fc6b7802d), [`1180dde2`](https://github.com/lemonmade/quilt/commit/1180dde278793006b8ae153804130cad6dab36c2), [`e45f766b`](https://github.com/lemonmade/quilt/commit/e45f766bce9e8632fe17d9e9c2e3d446d0783feb)]:
  - @quilted/threads@1.0.0
  - @quilted/events@1.0.0

## 0.5.147

### Patch Changes

- [`93facb53`](https://github.com/lemonmade/quilt/commit/93facb530324894667817a6d2f78baea19a3b622) Thanks [@lemonmade](https://github.com/lemonmade)! - Allow omitting React element from server renderer

## 0.5.146

### Patch Changes

- [#582](https://github.com/lemonmade/quilt/pull/582) [`6dca6fcf`](https://github.com/lemonmade/quilt/commit/6dca6fcf62fbed7600400b619e5509c7d7f7fb45) Thanks [@lemonmade](https://github.com/lemonmade)! - Allow async module global to be lazy initialized

- Updated dependencies [[`e121e639`](https://github.com/lemonmade/quilt/commit/e121e639fb656ddf14e3e47de87d347f38edae7f)]:
  - @quilted/graphql@1.1.0

## 0.5.145

### Patch Changes

- [`8fa1a6bd`](https://github.com/lemonmade/quilt/commit/8fa1a6bd67d3112ae0054f6fff531889f762cd52) Thanks [@lemonmade](https://github.com/lemonmade)! - Update Prettier dependencies

## 0.5.144

### Patch Changes

- [#571](https://github.com/lemonmade/quilt/pull/571) [`3bdd0dd3`](https://github.com/lemonmade/quilt/commit/3bdd0dd39654e64e52465c46aea95c7c06f2e1cb) Thanks [@lemonmade](https://github.com/lemonmade)! - Clean up GraphQL library for a V1

- Updated dependencies [[`3bdd0dd3`](https://github.com/lemonmade/quilt/commit/3bdd0dd39654e64e52465c46aea95c7c06f2e1cb), [`9122cbbc`](https://github.com/lemonmade/quilt/commit/9122cbbce965bf5b432027e0707b2d619857fa67)]:
  - @quilted/graphql@1.0.0
  - @quilted/useful-react-types@1.0.0

## 0.5.143

### Patch Changes

- [`839c33f6`](https://github.com/lemonmade/quilt/commit/839c33f6d22a5db0d97989e8c6ef9fa049698182) Thanks [@lemonmade](https://github.com/lemonmade)! - Random assortment of other dependency updates

## 0.5.142

### Patch Changes

- [#560](https://github.com/lemonmade/quilt/pull/560) [`553ff0fd`](https://github.com/lemonmade/quilt/commit/553ff0fd5b58ea6e788ad84dd6301b13210face9) Thanks [@lemonmade](https://github.com/lemonmade)! - Add changeset

- Updated dependencies [[`553ff0fd`](https://github.com/lemonmade/quilt/commit/553ff0fd5b58ea6e788ad84dd6301b13210face9)]:
  - @quilted/graphql@0.6.0

## 0.5.141

### Patch Changes

- Updated dependencies [[`350d2074`](https://github.com/lemonmade/quilt/commit/350d2074917e22bfa77ccad6bdcfe2f0f83ceb21)]:
  - @quilted/graphql@0.5.0

## 0.5.140

### Patch Changes

- [`97812120`](https://github.com/lemonmade/quilt/commit/978121207c65a4450a8ca9e43d017c6425a315c3) Thanks [@lemonmade](https://github.com/lemonmade)! - Update Preact dependencies and fix some missing peer dependencies

- Updated dependencies [[`97812120`](https://github.com/lemonmade/quilt/commit/978121207c65a4450a8ca9e43d017c6425a315c3)]:
  - @quilted/react-assets@0.0.4

## 0.5.139

### Patch Changes

- [#536](https://github.com/lemonmade/quilt/pull/536) [`cf6e2de1`](https://github.com/lemonmade/quilt/commit/cf6e2de186d8644fad9afcedda85c05002e909e1) Thanks [@lemonmade](https://github.com/lemonmade)! - Update to TypeScript 5.0

- Updated dependencies [[`cf6e2de1`](https://github.com/lemonmade/quilt/commit/cf6e2de186d8644fad9afcedda85c05002e909e1)]:
  - @quilted/assets@0.0.3
  - @quilted/react-assets@0.0.3

## 0.5.138

### Patch Changes

- [#532](https://github.com/lemonmade/quilt/pull/532) [`70b042d2`](https://github.com/lemonmade/quilt/commit/70b042d256579ab88e4ac65b2f869f143332de56) Thanks [@lemonmade](https://github.com/lemonmade)! - Move asset manifest code into asset packages

- Updated dependencies [[`70b042d2`](https://github.com/lemonmade/quilt/commit/70b042d256579ab88e4ac65b2f869f143332de56)]:
  - @quilted/assets@0.0.2
  - @quilted/react-assets@0.0.2

## 0.5.137

### Patch Changes

- [#527](https://github.com/lemonmade/quilt/pull/527) [`a255c7c2`](https://github.com/lemonmade/quilt/commit/a255c7c284391b2c3157fffed5a5feb576cd45ac) Thanks [@lemonmade](https://github.com/lemonmade)! - Improve asset manifests

- Updated dependencies [[`a255c7c2`](https://github.com/lemonmade/quilt/commit/a255c7c284391b2c3157fffed5a5feb576cd45ac)]:
  - @quilted/assets@0.0.1
  - @quilted/react-assets@0.0.1

## 0.5.136

### Patch Changes

- [#516](https://github.com/lemonmade/quilt/pull/516) [`575d9033`](https://github.com/lemonmade/quilt/commit/575d9033cfafa438b2998c6fea7e00a307ef0be7) Thanks [@lemonmade](https://github.com/lemonmade)! - Add `routes` to `Routing` component

- [#516](https://github.com/lemonmade/quilt/pull/516) [`575d9033`](https://github.com/lemonmade/quilt/commit/575d9033cfafa438b2998c6fea7e00a307ef0be7) Thanks [@lemonmade](https://github.com/lemonmade)! - Add timeout event helpers

## 0.5.135

### Patch Changes

- [`c4fbe548`](https://github.com/lemonmade/quilt/commit/c4fbe548d8f2bfd568ee21797896026148a3e37d) Thanks [@lemonmade](https://github.com/lemonmade)! - Add thread target utilities for iframes

## 0.5.134

### Patch Changes

- [#518](https://github.com/lemonmade/quilt/pull/518) [`10574343`](https://github.com/lemonmade/quilt/commit/105743435ad7143acb50dfdee92f6d3422167888) Thanks [@lemonmade](https://github.com/lemonmade)! - Update testing functions from mount() => render()

## 0.5.133

### Patch Changes

- [`3bcf9904`](https://github.com/lemonmade/quilt/commit/3bcf99041e5c27ecdafeeee96a176639269cb006) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix streaming responses missing body

## 0.5.132

### Patch Changes

- [`ad97e366`](https://github.com/lemonmade/quilt/commit/ad97e366a1663d39873d5f0c37938e708069f9fa) Thanks [@lemonmade](https://github.com/lemonmade)! - Preserve async app getter through response creation

## 0.5.131

### Patch Changes

- [#508](https://github.com/lemonmade/quilt/pull/508) [`befb2aa9`](https://github.com/lemonmade/quilt/commit/befb2aa9d374aff66cbfe54fc8157522e3d3af21) Thanks [@lemonmade](https://github.com/lemonmade)! - Move logic out of HTML component

## 0.5.130

### Patch Changes

- [`8f0f7ae1`](https://github.com/lemonmade/quilt/commit/8f0f7ae1e8f4678155bedcb0d4e5ac63a73d19d9) Thanks [@lemonmade](https://github.com/lemonmade)! - Update hydration approach for async components

## 0.5.129

### Patch Changes

- [#495](https://github.com/lemonmade/quilt/pull/495) [`0b7db36e`](https://github.com/lemonmade/quilt/commit/0b7db36e5333067761c8a88fec5722057ab0e04f) Thanks [@lemonmade](https://github.com/lemonmade)! - Match server and browser app entries

## 0.5.128

### Patch Changes

- [`76e88c75`](https://github.com/lemonmade/quilt/commit/76e88c75d89e194e084d879392fb7a718197ccdf) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix typings for GraphQL utilities and add dedicated quilt entrypoint

## 0.5.127

### Patch Changes

- [#486](https://github.com/lemonmade/quilt/pull/486) [`81f44ec5`](https://github.com/lemonmade/quilt/commit/81f44ec5fb7e379009e01beaf3cddc50a3e47953) Thanks [@lemonmade](https://github.com/lemonmade)! - Make async preload a little simpler

## 0.5.126

### Patch Changes

- [`55336251`](https://github.com/lemonmade/quilt/commit/5533625189999f06e5111a9acba14e001a9d847c) Thanks [@lemonmade](https://github.com/lemonmade)! - Clean up async APIs

## 0.5.125

### Patch Changes

- [`8f1d275b`](https://github.com/lemonmade/quilt/commit/8f1d275b6de0abbc6f61bcd5401555f6480eb474) Thanks [@lemonmade](https://github.com/lemonmade)! - Remove need for @babel/runtime peer dependency

- [`50215b7c`](https://github.com/lemonmade/quilt/commit/50215b7c005c21440bca04935fda87d98d9d9d01) Thanks [@lemonmade](https://github.com/lemonmade)! - Add additional security headers

## 0.5.124

### Patch Changes

- [#475](https://github.com/lemonmade/quilt/pull/475) [`de6bb615`](https://github.com/lemonmade/quilt/commit/de6bb615c1cdb763f9116e0649b21d6c46aaf9a4) Thanks [@lemonmade](https://github.com/lemonmade)! - Update to React 18

## 0.5.123

### Patch Changes

- [#474](https://github.com/lemonmade/quilt/pull/474) [`8890fad8`](https://github.com/lemonmade/quilt/commit/8890fad8d04efa95b362f4beaefcdbd51e65ba04) Thanks [@lemonmade](https://github.com/lemonmade)! - Looser React version restrictions

## 0.5.122

### Patch Changes

- [#470](https://github.com/lemonmade/quilt/pull/470) [`03e8da71`](https://github.com/lemonmade/quilt/commit/03e8da71c1c54b497f2b0d153a8414ae8e772666) Thanks [@lemonmade](https://github.com/lemonmade)! - Support suspense in react-server-render

## 0.5.121

### Patch Changes

- [`98c6aa4b`](https://github.com/lemonmade/quilt/commit/98c6aa4b9b5f45cc947f25446e1f05e2145d64a7) Thanks [@lemonmade](https://github.com/lemonmade)! - Improve HTML customization

- [#447](https://github.com/lemonmade/quilt/pull/447) [`6ad741b2`](https://github.com/lemonmade/quilt/commit/6ad741b241027c8d7612e206497935ad938ea6c9) Thanks [@lemonmade](https://github.com/lemonmade)! - Simplify app templates

## 0.5.120

### Patch Changes

- [`b4848099`](https://github.com/lemonmade/quilt/commit/b48480993d6d98a0d563a365f1d10b5bba3ad4c7) Thanks [@lemonmade](https://github.com/lemonmade)! - Add `usePerformanceNavigationEvent` hook

## 0.5.119

### Patch Changes

- [#436](https://github.com/lemonmade/quilt/pull/436) [`3171fcee`](https://github.com/lemonmade/quilt/commit/3171fceeddfb14c253ac45e34e1e2f9ab6e3f6c0) Thanks [@lemonmade](https://github.com/lemonmade)! - Rename http-handlers to request-router

## 0.5.118

### Patch Changes

- [`f8157c47`](https://github.com/lemonmade/quilt/commit/f8157c4751cd2cde941e452036fdb814124e0840) Thanks [@lemonmade](https://github.com/lemonmade)! - Remove email package from core

## 0.5.117

### Patch Changes

- [`2128fbe4`](https://github.com/lemonmade/quilt/commit/2128fbe469abc5589544d59317577cdc4f876353) Thanks [@lemonmade](https://github.com/lemonmade)! - Add raceAgainstAbortSignal utility

## 0.5.116

### Patch Changes

- [`d745ac4d`](https://github.com/lemonmade/quilt/commit/d745ac4d45275ad3c9185f091b1ae2e0571e0617) Thanks [@lemonmade](https://github.com/lemonmade)! - Update some Request types to EnhancedRequest

* [`f656f254`](https://github.com/lemonmade/quilt/commit/f656f2543b789c0cefb4ad6035c43cf714ccf6f6) Thanks [@lemonmade](https://github.com/lemonmade)! - Add createUseOptionalValueHook utility

## 0.5.115

### Patch Changes

- [`39544227`](https://github.com/lemonmade/quilt/commit/39544227abefed9185b500e3461ad4ec2e5f11cb) Thanks [@lemonmade](https://github.com/lemonmade)! - Add anyAbortSignal utility

## 0.5.114

### Patch Changes

- [`86587484`](https://github.com/lemonmade/quilt/commit/86587484846906e194bba956bbd338aa00544625) Thanks [@lemonmade](https://github.com/lemonmade)! - Add basic encoder overrides

## 0.5.113

### Patch Changes

- [`717494e8`](https://github.com/lemonmade/quilt/commit/717494e8d1ff76ce2b02ce6f583373924af44153) Thanks [@lemonmade](https://github.com/lemonmade)! - Expose additional thread types and functions

## 0.5.112

### Patch Changes

- [`163db45f`](https://github.com/lemonmade/quilt/commit/163db45f7a398a66d4ac0bac0dc5e6c3b3a62144) Thanks [@lemonmade](https://github.com/lemonmade)! - Add custom encoding method

## 0.5.111

### Patch Changes

- [`da699190`](https://github.com/lemonmade/quilt/commit/da699190fc9b5aa082533da2ab83e2b3f6d3c5bb) Thanks [@lemonmade](https://github.com/lemonmade)! - Add signals package

## 0.5.110

### Patch Changes

- [`51482122`](https://github.com/lemonmade/quilt/commit/514821223b4d8eb9c5289265c7cd2b4ef0b2e8b3) Thanks [@lemonmade](https://github.com/lemonmade)! - Add a utility for creating optional context

## 0.5.109

### Patch Changes

- [#370](https://github.com/lemonmade/quilt/pull/370) [`c7adecdf`](https://github.com/lemonmade/quilt/commit/c7adecdf5830dad00f1c071aa92469b922f68123) Thanks [@lemonmade](https://github.com/lemonmade)! - Allow simpler http handlers

## 0.5.108

### Patch Changes

- [`a12c3576`](https://github.com/lemonmade/quilt/commit/a12c357693b173461f51a35fb7efdd0a9267e471) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix more build issues

## 0.5.107

### Patch Changes

- [`0629288e`](https://github.com/lemonmade/quilt/commit/0629288ee4ba2e2ccfd73fbb216c3559e1a5c77e) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix missing package builds

## 0.5.106

### Patch Changes

- [#364](https://github.com/lemonmade/quilt/pull/364) [`4dc1808a`](https://github.com/lemonmade/quilt/commit/4dc1808a86d15e821b218b528617430cbd8b5b48) Thanks [@lemonmade](https://github.com/lemonmade)! - Update to simplified Quilt config

- Updated dependencies [[`4dc1808a`](https://github.com/lemonmade/quilt/commit/4dc1808a86d15e821b218b528617430cbd8b5b48)]:
  - @quilted/react@17.0.3
  - @quilted/react-dom@17.0.3

## 0.5.105

### Patch Changes

- [#359](https://github.com/lemonmade/quilt/pull/359) [`2eceac54`](https://github.com/lemonmade/quilt/commit/2eceac546fa3ee3e2c4d2887ab4a6a021acb52cd) Thanks [@lemonmade](https://github.com/lemonmade)! - Update TypeScript and ESLint to latest versions

* [#361](https://github.com/lemonmade/quilt/pull/361) [`47065859`](https://github.com/lemonmade/quilt/commit/47065859c330e2da23d8758fb165ae84a4f1af4f) Thanks [@lemonmade](https://github.com/lemonmade)! - Move to native Request and Response objects

## 0.5.104

### Patch Changes

- [`d9bedaf5`](https://github.com/lemonmade/quilt/commit/d9bedaf5fa212b37d3d3633a9495586df2d9e40c) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix missing React type exports

## 0.5.103

### Patch Changes

- [`a6e54ed1`](https://github.com/lemonmade/quilt/commit/a6e54ed1bae17b248e4c3d3ec28048a6b42b81e7) Thanks [@lemonmade](https://github.com/lemonmade)! - Remove quilt re-export of React

## 0.5.102

### Patch Changes

- [#331](https://github.com/lemonmade/quilt/pull/331) [`efc54f75`](https://github.com/lemonmade/quilt/commit/efc54f75cb29ec4143a8e52f577edff518014a6b) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix React types in stricter package managers

## 0.5.101

### Patch Changes

- [`7a077060`](https://github.com/lemonmade/quilt/commit/7a077060b793839bd9e426e2690f82596aab198c) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix asset and style handling for apps

## 0.5.100

### Patch Changes

- [#318](https://github.com/lemonmade/quilt/pull/318) [`0a43680e`](https://github.com/lemonmade/quilt/commit/0a43680e5425064f7d44bcede8b4df2afb72b3d4) Thanks [@lemonmade](https://github.com/lemonmade)! - Add support for importing static assets

## 0.5.99

### Patch Changes

- [`78b5f802`](https://github.com/lemonmade/quilt/commit/78b5f8029d3f9dddae8c7000a5ab711063500f6c) Thanks [@lemonmade](https://github.com/lemonmade)! - Improve signature of app request handler helpers

## 0.5.98

### Patch Changes

- [`f88502ca`](https://github.com/lemonmade/quilt/commit/f88502ca8c969d0da0991523cb1326c9fd6d2203) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix some events types and exports

## 0.5.97

### Patch Changes

- [`950955b4`](https://github.com/lemonmade/quilt/commit/950955b447d74daa16a8f81f9afaaf1dc52f56cf) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix quilt/threads entrypoint

## 0.5.96

### Patch Changes

- [#304](https://github.com/lemonmade/quilt/pull/304) [`c9b75e02`](https://github.com/lemonmade/quilt/commit/c9b75e02285fe6489f7a8e8b3e09d6815b918416) Thanks [@lemonmade](https://github.com/lemonmade)! - Add events and threads packages

## 0.5.95

### Patch Changes

- [`36b26d19`](https://github.com/lemonmade/quilt/commit/36b26d1997d8e5d558f46e3979cee24d48d1c71f) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix missing abort controller entry

## 0.5.94

### Patch Changes

- [#302](https://github.com/lemonmade/quilt/pull/302) [`b8940174`](https://github.com/lemonmade/quilt/commit/b894017459fa8e4e6d1a4fc918816356d36c8765) Thanks [@lemonmade](https://github.com/lemonmade)! - Add AbortController polyfill

* [#302](https://github.com/lemonmade/quilt/pull/302) [`b8940174`](https://github.com/lemonmade/quilt/commit/b894017459fa8e4e6d1a4fc918816356d36c8765) Thanks [@lemonmade](https://github.com/lemonmade)! - Improve service outputs

## 0.5.93

### Patch Changes

- [#298](https://github.com/lemonmade/quilt/pull/298) [`86afb486`](https://github.com/lemonmade/quilt/commit/86afb486023848fba9daba81e98e3b0eeb0bfbb6) Thanks [@lemonmade](https://github.com/lemonmade)! - Simplify GraphQL libraries

## 0.5.92

### Patch Changes

- [#287](https://github.com/lemonmade/quilt/pull/287) [`ba876cbe`](https://github.com/lemonmade/quilt/commit/ba876cbe4ddc313966dce0550349319a50490ba6) Thanks [@lemonmade](https://github.com/lemonmade)! - Add request context

## 0.5.91

### Patch Changes

- [#283](https://github.com/lemonmade/quilt/pull/283) [`daf06328`](https://github.com/lemonmade/quilt/commit/daf06328f242ac621b70942aa063a6138a12f62f) Thanks [@lemonmade](https://github.com/lemonmade)! - Rework asset manifest

## 0.5.90

### Patch Changes

- [`f4069df8`](https://github.com/lemonmade/quilt/commit/f4069df83ce5166056c7605144333445311427e1) Thanks [@lemonmade](https://github.com/lemonmade)! - Add reportOnly ContentSecurityPolicy prop

## 0.5.89

### Patch Changes

- [`b939a411`](https://github.com/lemonmade/quilt/commit/b939a411f76086915994789eb873641f0c7dd8cd) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix some quilt test exports

* [`281b36fd`](https://github.com/lemonmade/quilt/commit/281b36fd1dc6ea640da23e676b70673ce96d0080) Thanks [@lemonmade](https://github.com/lemonmade)! - Shorten URLs in HTML output

## 0.5.88

### Patch Changes

- [`38024ed6`](https://github.com/lemonmade/quilt/commit/38024ed6fd4f31a41bf910dbcfb5384f199ce186) Thanks [@lemonmade](https://github.com/lemonmade)! - Expose route localization in quilt

## 0.5.87

### Patch Changes

- [#269](https://github.com/lemonmade/quilt/pull/269) [`c78a1e13`](https://github.com/lemonmade/quilt/commit/c78a1e1365807e072cda4fece55d53712210cad4) Thanks [@lemonmade](https://github.com/lemonmade)! - Add localized routing

## 0.5.86

### Patch Changes

- [`b58c7857`](https://github.com/lemonmade/quilt/commit/b58c78570e75b8c431f3d30adf3f98ee3e68da0c) Thanks [@lemonmade](https://github.com/lemonmade)! - Re-export accept language parser utility

## 0.5.85

### Patch Changes

- [`6a7539b6`](https://github.com/lemonmade/quilt/commit/6a7539b67c4a85b6319acd14a378d1363dd95663) Thanks [@lemonmade](https://github.com/lemonmade)! - Add more http-handler exports to quilt/server

## 0.5.84

### Patch Changes

- [`82c653fa`](https://github.com/lemonmade/quilt/commit/82c653fa56df16b5b3a1e6e82b9e12745b5de895) Thanks [@lemonmade](https://github.com/lemonmade)! - Add react-utilities package with useContext helper

* [#265](https://github.com/lemonmade/quilt/pull/265) [`6b523901`](https://github.com/lemonmade/quilt/commit/6b52390142a0d075d6ce75e014e45cb02f5c6d9a) Thanks [@lemonmade](https://github.com/lemonmade)! - Simpler AppContext component

* Updated dependencies [[`82c653fa`](https://github.com/lemonmade/quilt/commit/82c653fa56df16b5b3a1e6e82b9e12745b5de895)]:
  - @quilted/react-utilities@0.1.0

## 0.5.83

### Patch Changes

- [#263](https://github.com/lemonmade/quilt/pull/263) [`6df853eb`](https://github.com/lemonmade/quilt/commit/6df853eb1e83abfa00e88b43e91b350da28d2704) Thanks [@lemonmade](https://github.com/lemonmade)! - Rename locale from environment hook

## 0.5.82

### Patch Changes

- Updated dependencies [[`b0040c72`](https://github.com/lemonmade/quilt/commit/b0040c7279931f426df5d7fac91a3a35ea49eae1)]:
  - @quilted/react-localize@0.1.0

## 0.5.81

### Patch Changes

- [`e65f1b91`](https://github.com/lemonmade/quilt/commit/e65f1b91b378058f6a39028417066582e76faf2a) Thanks [@lemonmade](https://github.com/lemonmade)! - Re-export GraphQLResult type

## 0.5.80

### Patch Changes

- [`4087f361`](https://github.com/lemonmade/quilt/commit/4087f361cd1a1bb8aa0d3334beb737569178bdb2) Thanks [@lemonmade](https://github.com/lemonmade)! - Re-export more react-server-render types

## 0.5.79

### Patch Changes

- [`ea331646`](https://github.com/lemonmade/quilt/commit/ea3316461bc42fe799e402a5635dd118e4a7e4a0) Thanks [@lemonmade](https://github.com/lemonmade)! - Improve GraphQL fetch naming and type exports

## 0.5.78

### Patch Changes

- [`eb9f7d42`](https://github.com/lemonmade/quilt/commit/eb9f7d4271010a8edfd683d825e9d49cb8969c8e) Thanks [@lemonmade](https://github.com/lemonmade)! - Improve usefulness of GraphQL client

* [#241](https://github.com/lemonmade/quilt/pull/241) [`04555fea`](https://github.com/lemonmade/quilt/commit/04555fea5652c30b27f146e10003e32fa16d66e8) Thanks [@lemonmade](https://github.com/lemonmade)! - Add react-query GraphQL hooks

## 0.5.77

### Patch Changes

- [`563e0097`](https://github.com/lemonmade/quilt/commit/563e009757ba94e8021bb927e00462483b84d1e0) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix React development server

## 0.5.76

### Patch Changes

- [`78fe1682`](https://github.com/lemonmade/quilt/commit/78fe1682e3f258ffca719c7eaaeeac05031dfa80) Thanks [@lemonmade](https://github.com/lemonmade)! - Simplify craft and sewing-kit

## 0.5.75

### Patch Changes

- [#214](https://github.com/lemonmade/quilt/pull/214) [`70dc3a9a`](https://github.com/lemonmade/quilt/commit/70dc3a9a52cec86224017874520e0ec941b8b85f) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix polyfill package resolution

## 0.5.74

### Patch Changes

- [`433f94f5`](https://github.com/lemonmade/quilt/commit/433f94f56a86a687b5f70a2887a83a3aae25e025) Thanks [@lemonmade](https://github.com/lemonmade)! - Add missing quilted/quilt/crypto entry

* [`5bdbcf9c`](https://github.com/lemonmade/quilt/commit/5bdbcf9c298d653dafca4996a5c28ff48829ed4e) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix package resolution for workers package

## 0.5.73

### Patch Changes

- [`65db3731`](https://github.com/lemonmade/quilt/commit/65db37312192507643bafa672a29d8e63cce823f) Thanks [@lemonmade](https://github.com/lemonmade)! - Force another version bump

## 0.5.72

### Patch Changes

- [`0735184`](https://github.com/lemonmade/quilt/commit/073518430d0fcabab7a2db9c76f8a69dac1fdea5) Thanks [@lemonmade](https://github.com/lemonmade)! - Publish new latest versions

## 0.5.71

### Patch Changes

- [#206](https://github.com/lemonmade/quilt/pull/206) [`d3c6346`](https://github.com/lemonmade/quilt/commit/d3c6346dc61a77fd6d45f13abe29222742b895fc) Thanks [@lemonmade](https://github.com/lemonmade)! - Remove unnecessary react alias dependencies

## 0.5.70

### Patch Changes

- [#203](https://github.com/lemonmade/quilt/pull/203) [`2a5063f`](https://github.com/lemonmade/quilt/commit/2a5063fe8e949eaa7829dd5685901b67a06c09c8) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix preact aliases in tests

* [#203](https://github.com/lemonmade/quilt/pull/203) [`2a5063f`](https://github.com/lemonmade/quilt/commit/2a5063fe8e949eaa7829dd5685901b67a06c09c8) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix test files being included in TypeScript output

## 0.5.69

### Patch Changes

- [`937a890`](https://github.com/lemonmade/quilt/commit/937a89009924a7b1d9e2a102028efd97928396e3) Thanks [@lemonmade](https://github.com/lemonmade)! - Improve base TypeScript preset

## 0.5.68

### Patch Changes

- [`c4c6792`](https://github.com/lemonmade/quilt/commit/c4c6792ef355cc3bc8c8ada65ec7b1db8a836fef) Thanks [@lemonmade](https://github.com/lemonmade)! - Improve server rendering helpers

## 0.5.67

### Patch Changes

- [`ec90a3f`](https://github.com/lemonmade/quilt/commit/ec90a3f0de7366a42fd1e13b903154f5bc8c0a54) Thanks [@lemonmade](https://github.com/lemonmade)! - Add simpler way of rendering React to a http-handlers response

## 0.5.66

### Patch Changes

- [`fb10e01`](https://github.com/lemonmade/quilt/commit/fb10e0181c26b6faedaea6f7fc5d88d7ccccc3d1) Thanks [@lemonmade](https://github.com/lemonmade)! - Add web crypto polyfill

* [`33c1a59`](https://github.com/lemonmade/quilt/commit/33c1a59c89fd9aeae81cb6072b4100d706268985) Thanks [@lemonmade](https://github.com/lemonmade)! - Add ability to nest http handlers

## 0.5.65

### Patch Changes

- [`c58ca94`](https://github.com/lemonmade/quilt/commit/c58ca9468f24c1cc193d67f56692e07e71e918ab) Thanks [@lemonmade](https://github.com/lemonmade)! - Add `Serialize` component

* [`f75a035`](https://github.com/lemonmade/quilt/commit/f75a035e5a6ec857497f28da9f0f0ba2d5d6112a) Thanks [@lemonmade](https://github.com/lemonmade)! - Add props customization to Quilt server handler

## 0.5.64

### Patch Changes

- [#190](https://github.com/lemonmade/quilt/pull/190) [`9bf454a`](https://github.com/lemonmade/quilt/commit/9bf454aaefc7ac6b85060fc5493b6b3ee4e2b526) Thanks [@lemonmade](https://github.com/lemonmade)! - Add easy environment variables

## 0.5.63

### Patch Changes

- [#185](https://github.com/lemonmade/quilt/pull/185) [`3b9a758`](https://github.com/lemonmade/quilt/commit/3b9a758c5703aa63b93a736e33f88a3bfa393fb8) Thanks [@lemonmade](https://github.com/lemonmade)! - Improve package entry declarations

## 0.5.62

### Patch Changes

- [#179](https://github.com/lemonmade/quilt/pull/179) [`ba2d282`](https://github.com/lemonmade/quilt/commit/ba2d28245528fc9825e36cfed85798b721f33152) Thanks [@lemonmade](https://github.com/lemonmade)! - Add useful-react-types package

## 0.5.61

### Patch Changes

- [#168](https://github.com/lemonmade/quilt/pull/168) [`ce60ec7`](https://github.com/lemonmade/quilt/commit/ce60ec7d864eb3b7c20a1f6cfe8839652bd8e3db) Thanks [@lemonmade](https://github.com/lemonmade)! - Add own utilities for handling cookie strings

* [#168](https://github.com/lemonmade/quilt/pull/168) [`ce60ec7`](https://github.com/lemonmade/quilt/commit/ce60ec7d864eb3b7c20a1f6cfe8839652bd8e3db) Thanks [@lemonmade](https://github.com/lemonmade)! - App server only renders requests for HTML

## 0.5.60

### Patch Changes

- [`091e067`](https://github.com/lemonmade/quilt/commit/091e067ff3240fcb140687d47afce73926ff70ac) Thanks [@lemonmade](https://github.com/lemonmade)! - Improve safety of magic entrypoints

## 0.5.59

### Patch Changes

- [`a9d3eb2`](https://github.com/lemonmade/quilt/commit/a9d3eb268447b50bb4504584d568fd16df158265) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix asset manifest creation and types in strict package environments

* [`73c25d2`](https://github.com/lemonmade/quilt/commit/73c25d295614141230c3607e92c8da5342e013d7) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix `createAsyncComponent()` typing in strict package environments

- [`1cd1f3b`](https://github.com/lemonmade/quilt/commit/1cd1f3b886081f40e7dfe1c2695516faf8e3b536) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix http-handlers imports in strict package environments

* [`d1b0622`](https://github.com/lemonmade/quilt/commit/d1b0622144a2af199c60aaa5d206d82ebc0214bf) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix React aliasing in strict package environments

- [`6ad3628`](https://github.com/lemonmade/quilt/commit/6ad362860eb65392ec5c5fa80c62e002e7f99f74) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix @quilted/polyfills in strict package environments

## 0.5.58

### Patch Changes

- [`917ea19`](https://github.com/lemonmade/quilt/commit/917ea19edbd8ad210675b11ef7f2ebe0c33e0b3e) Thanks [@lemonmade](https://github.com/lemonmade)! - Fixed dependencies to support stricter pnpm-based project
