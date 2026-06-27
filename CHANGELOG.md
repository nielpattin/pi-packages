# Changelog

This file summarizes the latest package changelog entries. Package changelogs remain the source of truth for package-specific history.

<!-- package-changelog-summary -->

### pi-multi-auth

## 0.11.1

### Patch Changes

- 3ddcc54: Update Pi peer dependencies to use `*` range per extension standard. Update `diff` to v9, `file-type` to v22, `esbuild` to ^0.28.1, and other dev dependencies to latest.

### @nielpattin/pi-permission-system

## 0.2.1

### Patch Changes

- 8b63e09: Fix session-approval suggestion for chained bash commands. Previously a command like `cd pkg && git push` produced a `cd *` session pattern that whitelisted the benign prefix and, via the trailing-`*` optional match, silently approved arbitrary chains (`cd x && rm -rf /`). Now chained commands (containing `&&`, `||`, `;`, `|`, `&`) derive the session pattern from the matched rule that triggered the prompt, and the "for this session" option is hidden entirely when no specific rule exists (catch-all `*` or implicit ask).
- 3ddcc54: Update Pi peer dependencies to use `*` range per extension standard. Update `diff` to v9, `file-type` to v22, `esbuild` to ^0.28.1, and other dev dependencies to latest.
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

## 0.8.0

### Minor Changes

- 7ba6ff3: Add undo/redo to the prompt editor input.

   - Undo: Ctrl+Z (also keeps the existing Ctrl+-). Intercepts the parent editor's undo to capture pre-undo state into a redo stack.
   - Redo: Ctrl+Y. Overrides Pi's yank (kill-ring paste) keybinding. Configurable via `shortcuts.redo` in station settings.
   - Redo stack is cleared on any new edit (standard undo/redo semantics), enforced via monkey-patched UndoStack.push.
   - Both keys are configurable via `shortcuts.undo` and `shortcuts.redo` in station settings.

   Fix cache_hit segment to use `latestCacheHitRate` from usage stats instead of computing hit rate from cumulative cacheRead/promptTokens. This matches the built-in footer's per-message cache hit rate display.

### Patch Changes

- 3ddcc54: Update Pi peer dependencies to use `*` range per extension standard. Update `diff` to v9, `file-type` to v22, `esbuild` to ^0.28.1, and other dev dependencies to latest.

### @nielpattin/pi-subagents

## 0.2.1

### Patch Changes

- 3ddcc54: Update Pi peer dependencies to use `*` range per extension standard. Update `diff` to v9, `file-type` to v22, `esbuild` to ^0.28.1, and other dev dependencies to latest.

<!-- /package-changelog-summary -->
