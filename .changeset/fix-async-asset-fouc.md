---
'@quilted/preact-browser': patch
---

Fix flash of unstyled content (FOUC) for async components

Async and preload asset placeholders are now rendered before the app content placeholder in the default `HTMLTemplateBody`. A pre-pass in the chunk renderer eagerly renders the app first so `browser.assets` is fully populated when the asset placeholders are processed. This ensures async component stylesheets are included in the HTML before the app content, preventing FOUC when streaming.

Async component scripts are now rendered as `modulepreload` link tags rather than blocking script tags.
