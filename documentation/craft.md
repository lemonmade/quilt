# Craft

Craft is a tooling orchestrator for Quilt. It takes care of running the many [tools](./thank-you.md#open-source) Quilt is built on top of, like [Rollup](https://rollupjs.org/guide/en/), [TypeScript](https://www.typescriptlang.org), and [ESLint](https://eslint.org), and gives you the ability to add commands and configuration of your own.

When you [generate a project with Quilt](./getting-started.md), you automatically have craft installed, and all of your development tasks are mapped to commands on a `quilt` executable provided by the [`@quilted/craft` package](../packages/craft). You can follow the instructions for the that package to add Craft to an existing project.

> **Note:** If you’re only using individual packages within Quilt or you don’t like this abstraction over your tools, you don’t need to use it! However, much of the value in using Quilt as a framework (including [build](./features/builds) and [development](./features/developing) flows) is configured through `craft`.

## Design goals

Building a whole layer on top of other tools is time-consuming and, for some developers, a big detractor to using Quilt. So, why did we build it, and what are we trying to accomplish by having it?

Quilt is trying to walk a fine line. On one hand, we need deep tooling integrations to support powerful features like [async components](./features/async.md), [easy-to-use workers](./features/workers.md), and a high-performance approach to [internationalization](./features/i18n.md), and we want to make these capabilities easy to use for developers of any skill level. On the other hand, we want to respect that projects, especially if they appreciate the composable, low-level nature of a lot of Quilt APIs, often have highly custom needs, and we [never want to block you from doing what you need to do](./priorities.md).

Craft is our best effort at solving for both of these priorities. It gives Quilt a framework for encapsulating configuration for dozens of tools into just a few lines of simple JavaScript, while giving you hooks to overwrite or customize every piece of configuration, and add new capabilities that are entirely driven by your own unique needs.

In addition to this critical design goal, Craft was also designed to:

- Have a way for teams to compose and share common configuration amongst themselves.
- Allow all configuration to be written in TypeScript with [great type-safety](./priorities.md#type-safety), and to have all configuration fields support being determined asynchronously.

## Tasks

Craft defines the “tasks” that you can run in development so that tools can be run at the right times. Currently, there are five tasks available:

- **Build** (`quilt build`), which [builds production outputs](./features/builds) for all your projects.
- **Develop** (`quilt develop`), which runs commands that let you [work on your projects locally](./developing).
- **Test** (`quilt test`), which [runs tests](./features/testing.md) for your projects.
- **Type check** (`quilt type-check`), which verifies the [static types](./features/type-checking.md) in your projects.
- **Lint** (`quilt lint`), which runs [linters](./features/linting.md) on the code in your projects.

There are many more tasks that are run in a normal development process, but Craft currently only helps with this subset. More might be added in the future, though!

## Configuration files

As a developer using Quilt, you will probably notice Craft mostly by the presence of `quilt.project.ts` and `quilt.workspace.ts` files in your repo. As noted in the [documentation on workspaces and projects](./projects.md), these configuration files let Craft understand the structure of your repo, including the apps, backend services, and packages that may require customized handling for one of the steps documented above.

These files will be executed using [native ES modules in Node](./esmodules.md). They **must** export a default export, which should be an object created by one of the `createWorkspace`, `createApp`, `createService`, or `createProject` functions from `@quilted/craft`:

```ts
// quilt.project.ts

import {createApp} from '@quilted/craft';

export default createApp((app) => {
  // ...
});
```

These files allow you to describe additional details about your project. In apps and services, you can use this file to declare the entry file for that project:

```ts
// quilt.project.ts

import {createApp} from '@quilted/craft';

export default createApp((app) => {
  // Points at a local `./app.ts`, `./app.tsx`, `./app.js`, or `./app/index.{js,ts,tsx}` file
  app.entry('./app');
});
```

In packages, you can declare multiple entries and executables that your package provides, as well as declare the runtimes your package executes in:

```ts
// quilt.project.ts

import {createProject, Runtime} from '@quilted/craft';

export default createProject((pkg) => {
  // Only works in Node
  pkg.runtime(Runtime.Node);

  // This is the “root” import, what you get from `import 'my-package'`
  pkg.entry({source: './source/index'});

  // This is what you’d get from `import 'my-package/testing'`
  pkg.entry({source: './source/testing', name: 'testing'});
});
```

Most importantly, your Craft configuration files declare the [Craft plugins](#plugins) used by that project. Plugins control what tools are run, and with what configuration. You can add additional plugins to any project or workspace with the `use()` method:

```ts
// quilt.project.ts

import {createApp} from '@quilted/craft';
import {
  someSewingKitPlugin,
  anotherSewingKitPlugin,
} from './configuration/craft.ts';

export default createApp((app) => {
  app.use(someSewingKitPlugin(), anotherSewingKitPlugin());
});
```

## Plugins

The core of Craft provides the [task structure](#tasks) and a set of utility functions and types, basically acting as the skeleton for plugins to add to. Plugins add all the [hooks](#hooks) that can collect configuration from other plugins, and add the definition of the [steps](#steps) that will be run for a given task. `@quilted/craft` provides plugins for all of Quilt’s features and recommended tools, but you can write additional plugins, too!

Plugins can apply either to the full workspace (command for tools that handle linting or type-checking, as these are generally done from the root of the repo), or can apply to individual projects inside the workspace (typical for tools that handle building and developing).

Workspace plugins are created using the `createWorkspacePlugin()` function from `@quilted/craft`:

```ts
// quilt.workspace.ts

import {createWorkspace, createWorkspacePlugin} from '@quilted/craft';

export default createWorkspace((workspace) => {
  workspace.use(
    createWorkspacePlugin({
      name: 'MyPlugin',
    }),
  );
});
```

The rest of this guide will focus on project plugins, as they are more common (you generally need to configure details about individual projects more than about the overall workspace). You create a project plugin using the `createProjectPlugin()` function:

```ts
// quilt.project.ts

import {createApp, createProjectPlugin} from '@quilted/craft';

export default createApp((app) => {
  app.use(
    createProjectPlugin({
      name: 'MyPlugin',
    }),
  );
});
```

The `createProjectPlugin()` accepts a generic type argument that lets you control what types of projects this plugin can be used with. This type will refine what hooks are available in the context of the plugin, and will warn consumers of the plugin if they use it in an unsupported project type.

When left unspecified, your plugin will support any project type, but it’s easy to narrow down. The example below shows a common pattern where we move our plugin to be created by a function call, and we explicitly declare the project type it supports to prevent unexpected usage:

```ts
import {createProjectPlugin} from '@quilted/craft';
import type {Package} from '@quilted/craft';

export function myPackagePlugin() {
  return createProjectPlugin<Package>({
    name: 'MyPackagePlugin',
  });
}

// In a consuming quilt.project.ts file...

// All good!
export default createProject((pkg) => {
  pkg.use(myPackagePlugin());
});

// Type error!
export default createApp((app) => {
  app.use(myPackagePlugin());
});
```

So far, the plugins we’ve shown haven’t actually done anything. In addition to the `name` field, which is required, your plugin can define any one of the following functions, which correspond to the [development tasks](#tasks) in Craft:

```ts
import {createProjectPlugin} from '@quilted/craft';

export function myPlugin() {
  return createProjectPlugin({
    name: 'MyPlugin',
    build({project, workspace, hooks, configure, run}) {},
    develop({project, workspace, hooks, configure, run}) {},
    test({project, workspace, hooks, configure, run}) {},
    typeCheck({project, workspace, hooks, configure, run}) {},
    lint({project, workspace, hooks, configure, run}) {},
  });
}
```

You only need to define the method for the tasks you would like to augment. Each task is a function that gets called with details about the `project` and `workspace`. It then lets you do any of the following: [add hooks for other plugins](#adding-hooks), [add configuration to hooks](#configuring-hooks), and/ or [add steps to run](#add-steps-to-run).

### Adding hooks

A big part of modern development tools (for better or for worse) is configuration. Sometimes, plugins can infer all the configuration they need from the project or workspace, but most times, it helps to have a way for other plugins (including those authored directly by the author of the app/ service/ package) to customize the configuration manually.

Craft provides a handy `WaterfallHook` object that allows developers to run potentially-async customizations to a value, which Quilt will make available to you when you [add configuration to other plugins](#configuring-hooks) or add a [step to run](#add-steps-to-run). A waterfall hook keeps track of its current value as it passes that value to each consumer who has “hooked into” it, allowing consumers to augment or replace that configuration.

There are two parts to adding a hook in Craft:

- Using the `hooks` function for a task to initialize your hooks
- Augmenting the TypeScript types so that your hook is visible to other plugins

The example below shows how to do both of these steps in order to add a `locale` hook for the build task. We’ll use this hook in the [configuring hooks](#configuring-hooks) section. In this example, we only need this hook for an app in our project, so we are restricting where the hook is added and what project types the plugin supports.

```ts
import {createProjectPlugin} from '@quilted/craft';
import type {App, WaterfallHook} from '@quilted/craft';

// Here is the hook we are adding:
export interface LocaleHooks {
  locale: WaterfallHook<string>;
}

// This is a "module augmentation", which teaches other libraries that
// this hook exists, even though it doesn’t exist in the core library.
// @quilted/sewing-kit is the module that provides all the basic types
// that Craft relies on for generating configuration and steps.
declare module '@quilted/sewing-kit' {
  // This looks a little strange; it is an augmentation of an existing
  // TypeScript interface in the `@quilted/sewing-kit` package. There are
  // base types that describe the available hooks for each task and project
  // type. They are named consistently, too; all you augment any task/ type
  // with a type in the format:
  //
  // {Build,Develop,Test,TypeCheck,Lint}{App,Service,Package,Project,Workspace}ConfigurationHooks
  interface BuildAppConfigurationHooks extends LocaleHooks {}
}

export function buildLocale() {
  return createProjectPlugin<App>({
    name: 'BuildLocale',
    build({hooks}) {
      // We call hooks with a function. That function is called with a utility
      // that lets us create the actual hook instances, and must return the
      // hooks we’ve declared.
      hooks<LocaleHooks>(({waterfall}) => {
        return {
          locale: waterfall(),
        };
      });
    },
  });
}
```

If you have a default value for your hook, you can pass an object with a `default` key to the `waterfall()` function above (the default can also be a function, and can return the default value asynchronously). If you do, you should use the `WaterfallHookWithDefault` type instead of `WaterfallHook`.

### Configuring hooks

Adding hooks is fine, but let’s use our plugin to do something a bit more meaningful. Your plugin can call the `configure` function for a given task to get access to all the hooks added by plugins to this project, and to “hook into” them to add your own configuration.

We’ll imagine that we have a custom Babel plugin related to our locale, and that we want to include that plugin for any build of this app that uses Babel. We’ll do that by using our own hook, and the `babelPlugins` hook provided by [`@quilted/craft/babel`](../packages/craft/source/tools/babel.ts):

```ts
import {createProjectPlugin} from '@quilted/craft';
import type {App, WaterfallHook} from '@quilted/craft';

// For TypeScript to “see” the additional hooks added by Craft
// plugins, we often need to bring in a reference to that module’s types
// explicitly.
import type {} from '@quilted/craft/babel';

// Same as before...
export interface LocaleHooks {
  locale: WaterfallHook<string>;
}

// Same as before...
declare module '@quilted/sewing-kit' {
  interface BuildAppConfigurationHooks extends LocaleHooks {}
}

export function buildLocale() {
  return createProjectPlugin<App>({
    name: 'BuildLocale',
    build({hooks, configure}) {
      hooks<LocaleHooks>(({waterfall}) => {
        return {
          locale: waterfall(),
        };
      });

      // We get access to all the hooks as the first argument to our function.
      // However, all of them are marked as being potentially `undefined`,
      // because there is no guarantee that the plugin that added the types
      // was actually included for this project. We use the optional chaining
      // operator (?.) for the babelPlugins hook to guard against it being
      // absent, but we know that `locale` will exist (since we added it!)
      // and so we use TypeScript’s non-null assertion operator for it (!).
      //
      // You add your layer of configuration to a hook by calling the hook
      // as a function. You can run a hook and get the result by calling its
      // run() method. Every hook supports async functions being hooked into
      // it, so `run()` returns a promise.
      configure(({locale, babelPlugins}) => {
        babelPlugins?.(async (plugins) => {
          plugins.push([
            'my-locale-babel-plugin',
            // Using `'en'` as our default, since our hook type requires a string.
            {locale: await locale!.run('en')},
          ]);

          return plugins;
        });
      });
    },
  });
}
```

To see what hooks are available to configure, we recommend using an editor with TypeScript intellisense, as all the various TypeScript module augmentations (like the one we did, for the `locale` hook) will be listed there.

The configuration function can be called multiple times. When creating steps, you can generate a new set of configuration hooks by passing custom “build options”. Plugins that add steps can use this mechanism to give other plugins a way of gating configuration to only apply to some steps. For example, the [app browser build](./features/builds/apps/browser.md) includes a `quiltAppBrowser` option when getting configuration for the build. We could teach our plugin to only run when the browser build is being generated by returning early if this option is not present:

```ts
// Imports and types omitted for clarity...

export function buildLocale() {
  return createProjectPlugin<App>({
    name: 'BuildLocale',
    build({hooks, configure}) {
      hooks(/* see previous examples... */);

      configure(({locale, babelPlugins}, {quiltAppBrowser}) => {
        if (!quiltAppBrowser) return;

        babelPlugins?.(async (plugins) => {
          plugins.push([
            'my-locale-babel-plugin',
            {locale: await locale!.run('en')},
          ]);

          return plugins;
        });
      });
    },
  });
}
```

### Adding steps to run

So far, we’ve added hooks, and we’ve added configuration to existing hooks. These hooks are typically consumed by a “step”, which is the way Craft describes an action that needs to be performed for a given task. Custom steps can be added with the `run()` function, which can return one step, an array of steps, or a promise for steps to run. This function is passed a `step()` function, which lets you construct steps, and a `configuration()` method that gives you access to the configuration for the project.

In the example below, we are adding a single step that logs the result of our `locale` hook.

```ts
// Imports and types omitted for clarity...

export function buildLocale() {
  return createProjectPlugin<App>({
    name: 'BuildLocale',
    build({hooks, configure, run}) {
      hooks(/* see previous examples... */);
      configure(/* see previous examples... */);

      run((step, {configuration}) => {
        return step({
          name: 'BuildLocale.Log',
          label: 'Logging the build locale',
          async run() {
            const {buildLocale} = await configuration();
            const locale = await buildLocale!.run('en');
            console.log(`Build locale is: ${locale}`);
          },
        });
      });
    },
  });
}
```

Steps must define the following properties:

- `name`, which is used as a short identifier for your step, and is how a developer could focus or skip your step for a task run (e.g., `--only-step BuildLocale.Log` will only run the step we define above, and `--skip-step BuildLocale.Log` will run all other steps).
- `label`, which is printed when your step is run.
- `run`, a function that executes your step’s logic (can be asynchronous).

Steps can also define the following properties:

- `stage`, which is one of `pre`, `default`, or `post`. This controls when this step is run relative to other steps for the project. Steps are always run in the following order, with each stage needing to complete entirely before the next begins: workspace pre steps, project pre steps, workspace default steps, project default steps, workspace post steps, project post steps.
- `needs`, a function that receives a `Step` object, and returns whether this step depends on that step. Steps can only depend on other steps in the same stage. Dependencies are guaranteed to be run before the dependent step.

### Composing other plugins

You may want to wrap a collection of Craft plugins up as a single plugin. This can be useful for developers that want to have a common set of plugins included in multiple projects. You can compose additional plugins by implementing the `create()` method for your plugin. This plugin is called with a `use()` function that you can use to include other plugins in any project that includes your plugin:

```ts
import {
  someSewingKitPlugin,
  anotherSewingKitPlugin,
} from './configuration/craft.ts';

export function composedPlugin() {
  return createProjectPlugin({
    name: 'ComposedPlugin',
    create({use}) {
      use(someSewingKitPlugin(), anotherSewingKitPlugin());
    },
  });
}
```

The `create` function can be asynchronous. This is particularly useful importing Craft plugins using dynamic imports. You can use this capability to include plugins only if the package that provides them can be imported:

```ts
export function workersIfAvailable() {
  return createProjectPlugin({
    name: 'CustomPluginIfAvailable',
    async create({use}) {
      try {
        const {myCustomPlugin} = await import('@my-projects/craft-plugins');
        use(myCustomPlugin());
      } catch {
        // Module not found, noop
      }
    },
  });
}
```
