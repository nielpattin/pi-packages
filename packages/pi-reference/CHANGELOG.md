# @nielpattin/pi-reference

## 0.1.0

### Initial release

Project references for the Pi coding agent. Declare local directories and Git repositories as accessible to the agent outside the current project.

**Configuration**

Add a `references` block to Pi settings (`~/.pi/agent/settings.json` global, `<project>/.pi/settings.json` project override):

```jsonc
{
   "references": {
      "docs": { "path": "../product-docs", "description": "Product documentation" },
      "sdk": { "repository": "anomalyco/opencode-sdk-js", "branch": "main", "description": "SDK source" },
      "effect": "Effect-TS/effect",
   },
}
```

Three entry forms: string shorthand (local if starts with `.`/`/`/`~`, otherwise git), local object (`path`/`description`/`hidden`), git object (`repository`/`branch`/`description`/`hidden`).

**Features**

- `@alias` autocomplete: type `@` to browse all reference aliases (cyan), `@alias/` to list files inside a reference, drill into subdirectories. Selecting a file inserts `@alias/path/to/file.ts` into the editor.
- `@alias/path` token expansion: on prompt submission, `@alias/path/to/file.ts` tokens are resolved to the reference's cache path and replaced with file content. Directory tokens get a listing. Large files (>100KB) get a placeholder.
- System prompt guidance: references with descriptions are injected as an XML block so the agent knows about them.
- Permission auto-allow: reference directories are pre-approved on the `external_directory` surface via `approveSessionRule()`, so the agent can read/grep/find/ls without prompts.
- Git materialization: repos cloned into `~/.cache/checkouts/<host>/<org>/<repo>` (reuses librarian cache path), refreshed on session start with a 5-minute throttle.
- Footer status bar: shows `refs: N` persistently.
- Clone widget: shows `cloning owner/repo...` above the editor during git operations, cleared when done.

**Changes to pi-permission-system**

- Added `approveSessionRule(surface, pattern)` to `PermissionsService` interface for cross-extension session-level allow rules.
