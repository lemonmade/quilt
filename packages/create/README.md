# `@quilted/create`

This package provides a command line tool for generating new Quilt projects.

When run inside an existing [Quilt workspace](../../documentation/projects.md), this command will add additional [apps](../../documentation/projects.md#apps) or [packages](../../documentation/projects.md#packages) to the same workspace.

You can also run it outside an existing repository, and it will create a new repository with a Quilt app or package. This new repo can be configured either as a “monorepo”, with room for additional projects, or as a repo just focused on a single project.

The best way to use this command is to run the `create` command in your favorite package manager. Quilt supports [npm](https://docs.npmjs.com/about-npm), [yarn](https://yarnpkg.com), and [pnpm](https://pnpm.io).

```bash
pnpm create @quilted # for pnpm
npm create @quilted # for npm
yarn create @quilted # for yarn
```

> **Note:** If you don’t already have a favorite package manager, we recommend [pnpm](https://pnpm.io). pnpm is fast, takes up less space on disk, and produces a strict package installation that enforces dependency management best practices.

This command will ask you what type of project you want to create. If you want to jump right to creating a particular kind of project, you can pass it as an additional argument to this command:

```bash
pnpm create @quilted app # create an app with pnpm
npm create @quilted package # create a package with npm
```

This command also accepts many command-line flags to pre-answer the questions you will be asked when creating your project. To learn more about these flags, run the command with the `--help` flag:

```bash
pnpm create @quilted --help
```
