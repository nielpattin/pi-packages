# Architecture

`@nielpattin/pi-magic-context` is a Pi extension package. It is a single flattened package with a Pi adapter in `src/` and shared runtime code in `core/`.

## Package layout

```text
src/      Pi extension entry, commands, tools, context handler, subagent runner
core/     Shared Magic Context runtime used by the Pi adapter
assets/   Local JSON schema copy
scripts/  Doctor and smoke checks
```

`package.json` registers the extension through:

```jsonc
"pi": {
  "extensions": ["./src/index.ts"]
}
```

Imports from shared runtime code use the package import map:

```jsonc
"imports": {
  "#core/*": "./core/*.ts"
}
```

## Entrypoints

### `src/index.ts`

Main extension entrypoint. Pi calls its default export once per session. The entrypoint:

1. Sets the harness to `pi`.
2. Opens the local SQLite database.
3. Loads `magic-context.jsonc` config.
4. Registers tools.
5. Registers the context transform pipeline.
6. Registers slash commands.
7. Registers the status line.
8. Registers dreamer scheduling when configured.
9. Hooks system prompt injection.
10.   Hooks session lifecycle events.

### `src/subagent-entry.ts`

Lean extension entry for Pi child sessions. It registers the Magic Context tool surface needed by subagents without registering the full runtime hooks. It also accepts the `--magic-context-dreamer-actions` flag so dreamer subagents can access the wider `ctx_memory` action set.

## Startup lifecycle

`src/index.ts` follows this startup flow:

1. Resolve storage path through `getMagicContextStorageDir()`.
2. Open `context.db` with `openDatabase()`.
3. Resolve the boot project identity with `resolveProjectIdentity()`.
4. Rehydrate deferred Pi compaction marker refresh state.
5. Load config with `loadPiConfig()`.
6. Stop registration early when `enabled: false`.
7. Ensure the project embedding configuration is registered.
8. Register tools with `registerMagicContextTools()`.
9. Register the Pi context handler with `registerPiContextHandler()`.
10.   Register commands and status line.
11.   Register dreamer scheduling if dreamer config is available.
12.   Register `before_agent_start`, `agent_end`, tool lifecycle, compaction, message, shutdown, and session switch hooks.

## Major subsystems

| Subsystem                  | Main files                                                                            |
| -------------------------- | ------------------------------------------------------------------------------------- |
| Config                     | `src/config/index.ts`, `core/config/schema/magic-context.ts`                          |
| Tools                      | `src/tools/index.ts`, `src/tools/*.ts`                                                |
| Commands                   | `src/commands/*.ts`, `src/dialogs/status-dialog.ts`                                   |
| Context transform          | `src/context-handler.ts`, `src/transcript-pi.ts`                                      |
| System prompt injection    | `src/system-prompt.ts`                                                                |
| Historian and compartments | `src/pi-historian-runner.ts`, `core/hooks/magic-context/compartment-*.ts`             |
| Dreamer                    | `src/dreamer/index.ts`, `core/features/magic-context/dreamer/*.ts`                    |
| Memory                     | `core/features/magic-context/memory/*.ts`                                             |
| Notes                      | `core/features/magic-context/storage-notes.ts`, `src/tools/ctx-note.ts`               |
| Storage                    | `core/features/magic-context/storage-db.ts`, `core/features/magic-context/storage.ts` |
| Checks                     | `scripts/doctor.mjs`, `scripts/smoke.mjs`                                             |

## Project identity

Project-scoped data uses `resolveProjectIdentity()` from `core/features/magic-context/memory/project-identity.ts`. Git-backed projects use the root commit hash when available. Non-git projects fall back to a stable directory hash.

## Runtime storage

Runtime storage is under:

```text
~/.pi/agent/pi-magic-context/
```

The SQLite database is:

```text
~/.pi/agent/pi-magic-context/context.db
```

Local embedding model files are cached in:

```text
~/.pi/agent/pi-magic-context/models/
```
