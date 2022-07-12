# `quilt run`

The `quilt run` command allows you to run some tools that are packaged with [Craft](../craft.md), Quilt’s optional development tool. Using `quilt run` is an alternative to using the `quilt` `test`, `type-check`, and `lint` commands, which automatically run theQuilt’s preferred set of [tools](TODO) that are relevant for a given development task. `quilt run` allows you to use the underlying tools more directly, while still benefitting from Craft’s smart defaults (and its [plugin-based configuration system](../craft.md#configuring-hooks)).

To use `quilt run`, you must provide an additional argument: the name of the tool to run. The following tools can be run directly using `quilt run`:

- [TypeScript](TODO), using [`quilt run typescript` or `quilt run tsc`](#quilt-run-typescript)
- [Jest](TODO), using [`quilt run jest`](#quilt-run-jest)
- [ESLint](TODO), using [`quilt run eslint`](#quilt-run-eslint)
- [Prettier](TODO), using [`quilt run prettier`](#quilt-run-prettier)

## `quilt run typescript`

`quilt run typescript` (aliased as `quilt run tsc`) allows you to run the TypeScript compiler, `tsc`. You can pass this command any of the [flags accepted by the `tsc` executable](https://www.typescriptlang.org/docs/handbook/compiler-options.html):

```sh
# Run TypeScript in watch mode
pnpm exec quilt run typescript --watch
```

By default, this command will run `tsc` with the [`--build` flag, which enables Project References](https://www.typescriptlang.org/docs/handbook/project-references.html). This matches the default way Quilt runs `tsc` when you use the [`quilt type-check` command](TODO). To disable this behavior, pass a `--no-build` flag to this command:

```sh
pnpm exec quilt run typescript --no-build
```

## `quilt run jest`

`quilt run jest` allows you to run the Jest test runner. You can pass this command any of the [flags accepted by the `jest` executable](https://jestjs.io/docs/cli):

```sh
# Run Jest on test files matching /app/, with test coverage enabled,
# and without tests being able to print to the console
pnpm exec quilt run jest app --silent --coverage
```

`quilt run

Unlike when running the [`quilt test` command](TODO), Using `quilt run jest` does not automatically run Jest in watch mode. To enable watch mode, you must run this command with the [`--watch`](https://jestjs.io/docs/cli#--watch) or [`--watchAll`](https://jestjs.io/docs/cli#--watchall) Jest flags:

```sh
pnpm exec quilt run jest --watch
```

## `quilt run eslint`

`quilt run eslint` allows you to run the ESLint linter. You can pass this command any of the [flags accepted by the `eslint` executable](https://eslint.org/docs/latest/user-guide/command-line-interface):

```sh
# Run `eslint` with a dry run of fixable errors
pnpm exec quilt run eslint --fix-dry-run
```

By default, this command runs on the entire contents of the directory you run this command from, just like when running [`quilt lint`](TODO). You can run ESLint on only a subset of your project by passing additional positional arguments:

```sh
# Run `eslint` on the ./app directory, relative to where you are running this command
pnpm exec quilt run eslint ./app
```

This command runs on JavaScript and TypeScript files, using the same configurable hooks as `quilt lint`. You can run ESLint on a different set of extensions by explicitly passing the [ESLint `--ext` flag](https://eslint.org/docs/latest/user-guide/command-line-interface#--ext):

```sh
# Run `eslint` only on JavaScript files
pnpm exec quilt run eslint --ext .js
```

Like `quilt lint`, this command defaults to running with ESLint’s [cache enabled](https://eslint.org/docs/latest/user-guide/command-line-interface#--cache). To disable this behavior, pass a `--no-cache` flag:

```sh
# Run `eslint` without cache
pnpm exec quilt run eslint --no-cache
```

## `quilt run prettier`

`quilt run prettier` allows you to run the Prettier linter. You can pass this command any of the [flags accepted by the `prettier` executable](https://prettier.io/docs/en/cli.html):

```sh
# Run `prettier`, preferring single quotes over double quotes
pnpm exec quilt run prettier --single-quote
```

By default, this command runs on a set of extensions that includes all the file types [Prettier is able to format](https://prettier.io/docs/en/index.html). Unlike `quilt lint`, which delegates Prettier checking of JavaScript and TypeScript files to ESLint, running `quilt run prettier` will run check JavaScript and TypeScript files with Prettier directly. You can customize the files that will be checked with prettier by passing an explicit glob pattern to this command:

```sh
# Run `prettier` on GraphQL files in the app directory.
pnpm exec quilt run prettier "./app/**/*.graphql"
```
