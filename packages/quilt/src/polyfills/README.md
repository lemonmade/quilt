# `@quilted/quilt/polyfills/*`

This directory re-exports the polyfills provided by `@quilted/polyfills`. This is done because most consumers will have a dependency only on `@quilted/quilt`, not `@quilted/polyfills`, but we need to insert imports for polyfills into “app code”. Strict package managers, like `pnpm`, will then install `@quilted/polyfills` in such a way that imports of that package fail to resolve. To fix this, we re-export all the entry points that can be inserted in app code from `@quilted/quilt/polyfills/*`.
