# Runtime pipeline

The runtime pipeline is registered by `src/index.ts` and implemented mainly in:

- `src/context-handler.ts`
- `src/transcript-pi.ts`
- `src/system-prompt.ts`
- `src/pi-historian-runner.ts`
- `src/dreamer/index.ts`

## Context transform

`registerPiContextHandler()` installs the per-LLM-call transform pipeline.

The handler receives Pi messages, wraps them in the shared transcript abstraction, then applies Magic Context behavior before the provider call.

Configured inputs from `src/index.ts` include:

- database handle,
- `ctx_reduce_enabled`,
- `protected_tags`,
- heuristic cleanup settings,
- memory injection budget,
- temporal awareness flag,
- scheduler thresholds,
- historian config,
- nudge config,
- auto-search config.

## Transcript adapter

`src/transcript-pi.ts` adapts Pi `AgentMessage[]` values into the shared transcript interface.

It normalizes Pi message and tool result shapes so shared Magic Context code can operate on them. It also tracks dirty/mutated messages for writeback.

## Tags and pending drops

When `ctx_reduce_enabled` is true, eligible message parts are tagged with `§N§` identifiers. The runtime stores tag metadata in the `tags` table and original content in `source_contents`.

`ctx_reduce` queues drop operations in `pending_ops`. The context transform later materializes queued operations when the relevant content is outside the protected tail.

When `ctx_reduce_enabled` is false, `ctx_reduce` is not registered and tag prefix injection is disabled.

## Heuristic cleanup

Heuristic cleanup settings are passed from config:

- `auto_drop_tool_age`,
- `drop_tool_structure`,
- `clear_reasoning_age`,
- optional age-tier caveman compression when `ctx_reduce_enabled` is false and `experimental.caveman_text_compression.enabled` is true.

Cleanup runs on execute passes rather than every defer pass.

## Session history injection

The context transform injects a `<session-history>` block into the session. It can include:

- compartments,
- session facts,
- project memories.

The memory injection budget comes from `memory.injection_budget_tokens`.

Temporal awareness is controlled by `experimental.temporal_awareness`.

## Scheduler and thresholds

Scheduler behavior uses:

- `execute_threshold_percentage`,
- `execute_threshold_tokens`,
- `cache_ttl`,
- observed context pressure.

Execute passes apply queued work and cleanup. Defer passes keep the prompt more cache-stable.

## Nudges

Nudges are configured only when reduce behavior is enabled. Nudge configuration includes:

- protected tag count,
- token interval,
- iteration threshold.

Nudges are intended to guide context-management behavior while preserving the newest tags.

## Auto-search hint

When `experimental.auto_search.enabled` is true, the transform can search for related memories, facts, or git commits for a new user message. The hint is compact and points the agent toward running `ctx_search`; it does not inject full search result content.

## Historian

Historian config is resolved from `historian` in `magic-context.jsonc`.

The Pi historian runner is `src/pi-historian-runner.ts`. It runs historian subagents through `PiSubagentRunner`, parses historian output, stores compartments/facts, queues drops for compartmentalized ranges, and can promote facts to memories when memory auto-promotion is enabled.

`/ctx-recomp` uses a separate `PiSubagentRunner` instance so manual recompartmentalization can run independently of normal historian work.

## Compressor

Compressor config is defined under `compressor` in the schema. It controls background compression of older compartments when rendered history exceeds its budget.

Config fields include:

- `enabled`,
- `min_compartment_ratio`,
- `max_merge_depth`,
- `cooldown_ms`,
- `max_compartments_per_pass`,
- `grace_compartments`.

Compression code lives under `core/hooks/magic-context/compartment-runner-compressor.ts` and related compartment runner files.

## Dreamer

Dreamer config is resolved from `dreamer` in `magic-context.jsonc`.

When configured and not disabled, `src/index.ts` calls `registerPiDreamerProject()` with:

- database handle,
- project directory,
- project identity,
- dreamer config,
- embedding config,
- memory enabled flag,
- git commit indexing config,
- system-prompt adjunct refresh callback.

Dreamer runtime files:

- `src/dreamer/index.ts`,
- `core/features/magic-context/dreamer/queue.ts`,
- `core/features/magic-context/dreamer/runner.ts`,
- `core/features/magic-context/dreamer/scheduler.ts`,
- `core/plugin/dream-timer.ts`.

`/ctx-dream` manually enqueues and runs a dreamer cycle.

## System prompt injection

`src/index.ts` hooks `before_agent_start` to inject Magic Context system prompt additions through `src/system-prompt.ts`.

The block can include:

- Magic Context guidance,
- project docs,
- user profile memories,
- key files,
- sticky date/cache-stability content.

Injection is skipped when:

- `system_prompt_injection.enabled` is false,
- the existing system prompt contains a configured skip signature.

## Lifecycle hooks

`src/index.ts` also registers handlers for:

- `agent_end`,
- `tool_execution_start`,
- `tool_execution_end`,
- `session_before_compact`,
- `message_end`,
- `session_shutdown`,
- `session_before_switch`.

These hooks update status state, capture todo state, handle compaction refresh, drain in-flight work, unregister dreamer projects, and clear per-session caches.
