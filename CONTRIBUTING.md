# Contributing

## Working on this repository

### Installing dependencies

This project uses

### Making changes

This project uses [changesets](https://github.com/changesets/changesets/blob/main/docs/intro-to-using-changesets.md) to manage package versioning. When adding a change, run `pnpm changeset`. This will prompt you to select the packages your change affects, and the type of change you are making (patch, minor, or major). This command will generate a new file in the `.changesets` directory, which you should edit to provide a detailed explanation of your changes.

To publish a new version, merge the pull request created by [changsets/action](https://github.com/changesets/action) on GitHub. Robots will take care of the rest!
