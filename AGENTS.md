# Quilt — Agent & Contributor Guide

Quilt is a TypeScript-first framework for building web **apps**, shared **packages**, and backend **services**. It is built on [Preact](https://preactjs.com) (with a React compatibility layer), uses [Vite](https://vite.dev) for local development and [Rollup](https://rollupjs.org) for production builds, and ships roughly 20 KB (minified + compressed) for a full-featured app including Preact itself.

---

## Repository layout

```
quilt/
├── packages/          # ~40 framework packages (all @quilted/* scoped)
├── integrations/      # 5 platform integrations (Cloudflare, Deno, HTMX, React Query, tRPC)
├── documentation/     # Markdown docs for the framework
├── tests/             # Unit and E2E test suites
├── configuration/     # Shared Vite/Vitest config
└── .github/workflows/ # CI/CD pipelines
```

All packages and integrations are managed as a **pnpm workspace** (see `pnpm-workspace.yaml`). The root `package.json` is private and never published.

---

## Key commands

All commands are run from the repository root with **pnpm**.

| Command             | What it does                                                        |
| ------------------- | ------------------------------------------------------------------- |
| `pnpm test`         | Run unit tests with Vitest (watch mode in terminal)                 |
| `pnpm test.e2e`     | Run E2E tests with Vitest + Playwright                              |
| `pnpm type-check`   | TypeScript build check across all packages (`tsc --build`)          |
| `pnpm lint`         | Check formatting with Prettier                                      |
| `pnpm format`       | Auto-fix formatting with Prettier                                   |
| `pnpm build`        | Production build (Rollup first, then all other packages)            |
| `pnpm changeset`    | Create a changeset entry for your changes (required before merging) |
| `pnpm version-bump` | Bump versions from pending changesets                               |

> **Build order matters.** The `build` script intentionally builds `@quilted/rollup` before everything else, because other packages depend on it: `pnpm --filter rollup run build && pnpm --filter !rollup run build`.

CI runs lint → type-check → unit tests → E2E tests in sequence. All four must pass before merging.

---

## Package conventions

### Source vs. build imports

Packages expose a `quilt:source` export condition pointing at raw TypeScript source (e.g. `./source/index.ts`). This is used during development and by `tsx` scripts so you never need to pre-build packages to work on them locally.

```json
"exports": {
  ".": {
    "quilt:source": "./source/index.ts",
    "quilt:esnext": "./build/esnext/index.js",
    "import": "./build/esm/index.js"
  }
}
```

When writing scripts or tests that import workspace packages, pass `--conditions quilt:source` (or use the `typescript.run` / `typescript.watch` root scripts):

```bash
pnpm typescript.run ./some-script.ts
```

### TypeScript project references

The root `tsconfig.json` uses TypeScript [project references](https://www.typescriptlang.org/docs/handbook/project-references.html). When adding a new package or a new cross-package dependency, update both the consuming package's `tsconfig.json` `references` array and the root `tsconfig.json`.

### React compatibility

Quilt uses **Preact**, not React. The packages `@quilted/react` and `@quilted/react-dom` re-export Preact under the React namespace so that most third-party React packages work without modification. Prefer importing from `@quilted/quilt` (or the specific `@quilted/preact-*` package) rather than `react` in framework code.

---

## Project types

Quilt recognizes three kinds of projects inside a workspace:

- **App** — a browser application with optional server-side rendering. Vite handles local dev; Rollup handles production. Multiple browser targets are built automatically.
- **Package** — a shareable library, built with Rollup into ESM (and optionally CJS). Quilt uses itself to build itself.
- **Service** — a backend HTTP server, typically using [Hono](https://hono.dev). Can be deployed to Node, Cloudflare Workers, Deno, etc.

Templates for all three are available via `pnpm create @quilted <app|package|service>`.

---

## Making changes

1. **Edit source** in `packages/<name>/source/` or `integrations/<name>/source/`.
2. **Run checks** — `pnpm type-check && pnpm test && pnpm lint`.
3. **Create a changeset** — `pnpm changeset`. Select the affected packages and describe the change. Edit the generated `.changeset/*.md` file to provide context.
4. **Open a PR.** The changeset bot will create a version-bump PR automatically once your changes land on `main`.

Changesets are **required** for any change that affects a published package. Omit them only for docs-only or internal tooling changes.

When creating a new package, use `pnpm create @quilted package` to scaffold the package, which uses the public version of the `@quilted/create` package to create the package (so meta!).

---

## Design priorities (abbreviated)

1. **Performance** — ship only what you use; tree-shake aggressively; multi-browser-target builds.
2. **Type safety** — TypeScript-first, including type-safe GraphQL via Quilt's own codegen.
3. **Component-first** — features (routing, HTML, localization) are enabled by rendering components, not config.
4. **Explicitness** — opt in to features rather than having them active by default.
5. **Small-but-mighty** — curated, replaceable tools over framework bloat.

Full design rationale: [`documentation/priorities.md`](./documentation/priorities.md).

---

## Testing

- **Unit tests** live alongside source in `packages/<name>/source/` or in `tests/`.
- **E2E tests** live in `tests/` and use Playwright. Run with `pnpm test.e2e`.
- Test utilities: `@quilted/preact-testing` / `@quilted/react-testing` wrap Preact's test renderer with helpful utilities.
- Vitest config: `vitest.workspace.js` (unit) and `configuration/vite.e2e.config.ts` (E2E).

---

## Key packages reference

| Package                               | Description                                                                                                                                                     |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@quilted/quilt`                      | Umbrella entry point — re-exports async, browser, context, events, localize, navigation, performance, signals, testing, graphql, server, hono, threads, modules |
| `@quilted/vite`                       | Vite plugin for Quilt apps and packages                                                                                                                         |
| `@quilted/rollup`                     | Rollup plugin/config for production builds                                                                                                                      |
| `@quilted/preact-router`              | File-based and component-based routing                                                                                                                          |
| `@quilted/preact-async`               | Code-splitting and async component loading                                                                                                                      |
| `@quilted/preact-browser`             | HTML document management (`<Title>`, `<Meta>`, etc.)                                                                                                            |
| `@quilted/graphql`                    | Type-safe GraphQL client + codegen                                                                                                                              |
| `@quilted/threads`                    | Message-passing between JS environments (workers, iframes)                                                                                                      |
| `@quilted/http`                       | HTTP utilities and typed request/response helpers                                                                                                               |
| `@quilted/create`                     | `pnpm create @quilted` scaffolding CLI                                                                                                                          |
| `@quilted/cloudflare` _(integration)_ | Cloudflare Workers deployment adapter                                                                                                                           |
| `@quilted/hono` _(integration)_       | Hono integration for Quilt services                                                                                                                             |

Full package list: [`packages/`](./packages/) and [`integrations/`](./integrations/).

---

## Documentation

Human-readable guides live in [`documentation/`](./documentation/):

- [`getting-started.md`](./documentation/getting-started.md) — create your first app, package, or service
- [`priorities.md`](./documentation/priorities.md) — design philosophy and tradeoffs
- [`tools.md`](./documentation/tools.md) — pnpm, Vite, Rollup, Vitest, Prettier, tsx
- `features/` — routing, async, GraphQL, HTML, HTTP, localization, server rendering, workers, styles, etc.
- `projects/` — app, package, and service deep-dives
- `integrations/` — Hono, HTMX, Tailwind, tRPC, Web Vitals
- `technology/` — Preact, TypeScript, GraphQL background
