# Changelog

This file summarizes the latest package changelog entries. Package changelogs remain the source of truth for package-specific history.

<!-- package-changelog-summary -->

### pi-multi-auth

## 0.11.1

### Patch Changes

- 3ddcc54: Update Pi peer dependencies to use `*` range per extension standard. Update `diff` to v9, `file-type` to v22, `esbuild` to ^0.28.1, and other dev dependencies to latest.

### @nielpattin/pi-permission-system

## 0.2.2

### Patch Changes

- 69ce847: Edit permission dialog no longer renders the diff (it lives in the chat
  transcript via the edit tool's own renderCall) and the session-approval
  option now shows an absolute directory path.

   - Removed the edit diff from the permission dialog message. The dialog
     (rendered as a bold accent title by Pi's ExtensionSelectorComponent)
     now carries only the ask text + options. The diff is shown in the chat
     by the edit tool's renderCall, mirroring OpenCode where the diff lives
     in the chat/body, not the status header.
   - `formatEditInputForPrompt` returns path-only (no replacement-count
     summary); the diff carries all detail.
   - `deriveApprovalPattern` now resolves the path to an absolute,
     case-preserving form before deriving the glob, so the "for this session"
     option reads `Yes, allow edit "C:/Users/.../proj/*" for this session`
     instead of the bare relative `./*`. Same directory-scoped scope (narrower
     than OpenCode's catch-all `*`), clearer label.

### @nielpattin/pi-reference

## 0.2.0

### Minor Changes

- 0514ff7: Add pi-reference package: project references for Pi. Declare local directories and Git repos as accessible to the agent via system prompt guidance and permission auto-allow.

   Features:

   - Config in settings.json `references` block (global + project, string/object entry forms)
   - Git repos cloned into ~/.cache/checkouts (reuses librarian cache path), refreshed on session start with 5-min throttle
   - @alias autocomplete: type @ to browse reference aliases (cyan), @alias/ to browse files, drill into directories
   - @alias/path tokens in submitted prompts are expanded to file content (or directory listings)
   - System prompt XML guidance for references with descriptions
   - Permission auto-allow via external_directory session rules
   - Footer status bar shows "refs: N"
   - Transient widget above editor shows "cloning owner/repo..." during git operations

   Extend PermissionsService with approveSessionRule() for cross-extension session-level allow rules.

### @nielpattin/pi-simplify

## 0.2.9

### Patch Changes

- 3ddcc54: Update Pi peer dependencies to use `*` range per extension standard. Update `diff` to v9, `file-type` to v22, `esbuild` to ^0.28.1, and other dev dependencies to latest.

### @nielpattin/pi-station

## 0.9.0

### Minor Changes

- 69ce847: Add esbuild build pipeline (dist/) and show edit diff in chat transcript.

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

### @nielpattin/pi-subagents

## 0.2.1

### Patch Changes

- 3ddcc54: Update Pi peer dependencies to use `*` range per extension standard. Update `diff` to v9, `file-type` to v22, `esbuild` to ^0.28.1, and other dev dependencies to latest.

<!-- /package-changelog-summary -->
