---
"@nielpattin/pi-station": minor
---

Add esbuild build pipeline (dist/) and show edit diff in chat transcript.

- pi-station is now a built package: `pnpm build` bundles index.ts and
  features/hashline/edit-tool.ts to dist/ via esbuild, with Pi/typebox/node
  builtins marked external. `pi.extensions` points at `./dist/index.js`.
  dist/ is gitignored and rebuilt locally + in CI (publish.yml gained a
  "Build package" step). After editing pi-station source, run
  `pnpm --dir packages/pi-station build` before /reload.
- The edit tool's renderCall now computes its diff preview synchronously
  (new `computeEditPreviewSync`) whenever a renderable edit input is
  present, so the diff appears in the chat the moment the permission
  dialog opens. The previous gate on argsComplete/executionStarted never
  became true on the visible render frames during the permission prompt,
  so the diff was never shown.
