# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Full contributor guide**: [`AGENTS.md`](../AGENTS.md) at the repo root. Read it first — it covers commands, package conventions, project types, testing, changesets, and the key-packages reference.

---

## Essential commands

```bash
pnpm test                   # Unit tests (Vitest, watch mode)
pnpm test.e2e               # E2E tests (Vitest + Playwright)
pnpm test.e2e <path>        # Run a single E2E test file
pnpm type-check             # tsc --build across all packages
pnpm lint                   # Prettier format check
pnpm format                 # Prettier auto-fix
pnpm build                  # Production build (Rollup first, then rest)
pnpm changeset              # Create changeset (required for published-package changes)
pnpm typescript.run <file>  # Run a TS script against source (--conditions quilt:source)
```

---

## Architecture at a glance

Quilt is a **Preact-based** monorepo (~40 `@quilted/*` packages + 5 integrations) managed with pnpm workspaces. Three project types: **app** (Vite dev / Rollup prod), **package** (Rollup ESM), **service** (Hono + Rollup).

### How packages export their APIs

Every package uses conditional exports with three targets:

| Condition      | Points to                 | Used by                    |
| -------------- | ------------------------- | -------------------------- |
| `quilt:source` | `./source/index.ts`       | Local dev, tests, scripts  |
| `quilt:esnext` | `./build/esnext/index.js` | Advanced bundler consumers |
| `import`       | `./build/esm/index.js`    | Production (default)       |

**You never need to pre-build packages to work locally** — import resolution follows `quilt:source` during development and in tests.

### TypeScript project references

The root `tsconfig.json` lists every package as a reference. When adding a new package dependency, update **both** the consuming package's `tsconfig.json` `references` array **and** the root `tsconfig.json`.

### React ↔ Preact

`@quilted/react` and `@quilted/react-dom` re-export Preact under the React namespace. In framework code, prefer `@quilted/quilt` or `@quilted/preact-*` imports over `react`.

---

## Where things live

- `packages/<name>/source/` — TypeScript source for all framework packages
- `integrations/<name>/source/` — Platform integrations (Cloudflare, Deno, HTMX, React Query, tRPC)
- `tests/e2e/` — E2E tests + fixtures (`fixtures/`) + temporary output (`output/`)
- `configuration/` — Shared Vite/Vitest configs (`vite.unit.config.ts`, `vite.e2e.config.ts`)
- `documentation/` — Markdown guides (features, projects, integrations, technology)

---

## E2E test pattern

```ts
it('renders the app', async () => {
  await using workspace = await Workspace.create({fixture: 'empty-app'});
  const server = await startServer(workspace);
  const page = await server.openPage();
  expect(await page.textContent('body')).toBe('Hello world');
});
```

To debug a failing E2E test, add `debug: true` (keeps the temp workspace) and `it.only(...)` to focus on a single test. Use `CI=1 pnpm test.e2e` to match CI behavior.

---

## Before opening a PR

1. `pnpm type-check && pnpm test && pnpm lint`
2. `pnpm changeset` — required for any change to a published package; select affected packages and describe the change.
