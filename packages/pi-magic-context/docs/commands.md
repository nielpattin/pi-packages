# Commands

Commands are registered from `src/index.ts` through files under `src/commands/`.

## `/ctx-status`

Source:

- `src/commands/ctx-status.ts`
- `src/dialogs/status-dialog.ts`

Shows Magic Context status for the current Pi session.

Interactive sessions use a centered custom overlay. Non-UI contexts send a status message through `pi.sendMessage(..., { triggerTurn: false })`.

The overlay renders a cached first paint from `session_meta`, then schedules a full status refresh after the first render and continues refreshing every second.

See [Status overlay](./status-overlay.md) for each field.

## `/ctx-flush`

Source: `src/commands/ctx-flush.ts`

Forces pending Magic Context drops to materialize on the next provider call.

The command signals refresh/materialization state so the context transform re-reads pending operations and system prompt state on the next turn.

## `/ctx-recomp`

Source: `src/commands/ctx-recomp.ts`

Rebuilds Magic Context compartments from raw Pi session history.

The command uses a `PiSubagentRunner` and historian prompt configuration. It supports recomp workflows that rebuild all compartments or rebuild a specific range, with confirmation handling in the command.

Runtime dependencies passed from `src/index.ts` include:

- database handle,
- historian model,
- historian fallback models,
- historian timeout,
- historian thinking level,
- memory enabled flag,
- auto-promote flag.

## `/ctx-dream`

Source: `src/commands/ctx-dream.ts`

Runs a Magic Context dreamer cycle for the current project.

Behavior from code:

- refuses to run when dreamer is disabled,
- resolves the active project from command context,
- enqueues a dream run,
- drains the project dream queue,
- reports task results with `pi.sendMessage(..., { triggerTurn: false })`.

## `/ctx-aug`

Source:

- `src/commands/ctx-aug.ts`
- `core/features/magic-context/sidekick/core.ts`

Runs the sidekick augmentation flow for the current prompt.

The command uses sidekick config from `magic-context.jsonc`. If sidekick is missing or disabled, it reports that state rather than spawning a subagent.

When configured, it spawns a sidekick subagent with:

- configured model,
- fallback models,
- timeout,
- optional system prompt override,
- optional thinking level.

The result is appended as a `<sidekick-augmentation>` block.

## Command output behavior

The admin/status commands send Pi messages with `triggerTurn: false` where appropriate. These command responses are visible to the user but do not start a new LLM turn.
