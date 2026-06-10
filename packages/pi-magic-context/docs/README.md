# Pi Magic Context docs

This folder documents the local Pi Magic Context package as implemented in code.

## Files

- [Architecture](./architecture.md). Package structure, entrypoints, startup lifecycle, and major subsystems.
- [Runtime diagrams](./diagrams.md). Mermaid diagrams for startup, transform, auto-search, Historian, Dreamer, tools, status overlay, demo mode, and failure handling.
- [Configuration](./configuration.md). Config file locations, merge behavior, and supported config sections.
- [Commands](./commands.md). Slash commands registered by the extension.
- [Tools](./tools.md). Agent-facing tools registered by the extension.
- [Status overlay](./status-overlay.md). Fields shown by `/ctx-status` and where they come from.
- [Storage](./storage.md). Local storage paths, SQLite database behavior, and main tables.
- [Runtime pipeline](./runtime-pipeline.md). Context transform, history injection, historian, dreamer, and system prompt hooks.
- [Operations](./operations.md). Local checks, smoke test, logs, and troubleshooting paths.

## Source files

The primary source files are:

- `src/index.ts`
- `src/context-handler.ts`
- `src/dialogs/status-dialog.ts`
- `src/commands/*.ts`
- `src/tools/*.ts`
- `src/config/index.ts`
- `core/config/schema/magic-context.ts`
- `core/features/magic-context/storage-db.ts`
- `scripts/doctor.mjs`
- `scripts/smoke.mjs`
