---
"@nielpattin/pi-reference": minor
"@nielpattin/pi-permission-system": patch
---

Add pi-reference package: project references for Pi. Declare local directories and Git repos as accessible to the agent via system prompt guidance and permission auto-allow.

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
