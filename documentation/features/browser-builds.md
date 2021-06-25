# Browser builds

## Automatic browser scripts

TODO

## Browser support

Quilt produces multiple builds targeting different sets of browsers. This process, sometimes called [differential serving](./TODO), allows users with more modern browsers to receive smaller bundle sizes thanks to fewer features needing transpilation or polyfilling.

By default, Quilt produces three browser builds for your application:

- One targeting a wide swath of in-use browsers (excludes IE 11) (`default`)
- One targeting the browsers that natively support ES modules (`modules`)
- One targeting the last one version of Chrome, Firefox, Safari, and Edge (`evergreen`)

If you are using the [automatic server generation](./TODO) for your application, that server will read the user agent string, and select the correct assets to use for each individual request.

You can customize what builds get produced for your application by specifying a [browserslist configuration](https://github.com/browserslist/browserslist) for your application. This configuration can be placed in any of the [supported browserslist configuration formats](https://github.com/browserslist/browserslist#config-file), but we generally recommend putting it in the app’s `package.json`.

Quilt provides the default targets it uses through the `@quilted/browserslist-config` package, which makes it easy to add additional builds while keeping some of Quilt’s defaults. For example, the following browserslist configuration, placed in a `package.json`, would use the modules and "evergreen" targets described above, but would use a default build that includes support for IE 11:

```json
{
  "browserslist": {
    "defaults": ["defaults", "IE 11"],
    "modules": ["@quilted/browserslist-config/modules"],
    "evergreen": ["@quilted/browserslist-config/evergreen"]
  }
}
```

Each named configuration will be turned into a build, with the name being included in the resulting file for easy identification. Quilt will intelligently determine whether to use native ES modules for this group, and will make sure the necessary language features are compiled into a format that works for those targets.
