---
"@nielpattin/pi-subagents": patch
---

feat(pi-subagents): load lean magic-context in subagents

When the sibling `pi-magic-context` package is available, subagents with
`extensions: true` now load only the lean extension entry
(`subagent-entry.js` / `subagent-entry.ts`) instead of the full extension
set. This registers only the tool surface (`ctx_search`, `ctx_memory`,
`ctx_note`, `ctx_expand`) — no historian, dreamer, or prompt injection —
avoiding recursion risk, wasted startup, and unexpected content in child
sessions.

- Added `resolveLeanMagicContextEntry()` utility that resolves the sibling
  package's compiled or source entry point.
- Added `leanExtensionPaths` field to `RunnerDeps` and `ResourceLoaderOptions`.
- Modified `runAgent()` to skip full extension discovery when lean paths are
  available and `extensions: true`, passing them via `additionalExtensionPaths`
  instead.
- Wired lean entry resolution at startup in the extension's main entry.
