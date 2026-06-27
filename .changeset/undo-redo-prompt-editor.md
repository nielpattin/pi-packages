---
"@nielpattin/pi-station": minor
---

Add undo/redo to the prompt editor input.

- Undo: Ctrl+Z (also keeps the existing Ctrl+-). Intercepts the parent editor's undo to capture pre-undo state into a redo stack.
- Redo: Ctrl+Y. Overrides Pi's yank (kill-ring paste) keybinding. Configurable via `shortcuts.redo` in station settings.
- Redo stack is cleared on any new edit (standard undo/redo semantics), enforced via monkey-patched UndoStack.push.
- Both keys are configurable via `shortcuts.undo` and `shortcuts.redo` in station settings.

Fix cache_hit segment to use `latestCacheHitRate` from usage stats instead of computing hit rate from cumulative cacheRead/promptTokens. This matches the built-in footer's per-message cache hit rate display.
