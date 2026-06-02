# Status overlay

`/ctx-status` is implemented by:

- `src/commands/ctx-status.ts`
- `src/dialogs/status-dialog.ts`

Interactive Pi sessions show a centered custom overlay through `ctx.ui.custom(..., { overlay: true })`.

## Rendering model

`StatusDialogComponent` keeps a `StatusDialogDetail` object and renders it into a bordered text UI.

First paint uses `buildCachedPiStatusDetail()`, which reads cheap cached/session metadata. After the first render, the component schedules a full refresh with `buildPiStatusDetail()`. The component also refreshes every second while open.

This keeps the visual UI unchanged while keeping the constructor path lightweight.

Profiling logs are gated by:

```text
PI_MAGIC_CONTEXT_PROFILE_STATUS=1
```

## Header

```text
⚡ Magic Context Status   v0.1.0
```

The version comes from `package.json`.

## Context line

```text
Context  52.0% · 141.3K / 272K tokens
```

Fields:

- usage percentage from `ctx.getContextUsage()` when available, otherwise `session_meta.lastContextPercentage`,
- input tokens from `ctx.getContextUsage()` when available, otherwise `session_meta.lastInputTokens`,
- context limit from `ctx.getContextUsage().contextWindow` when available, otherwise inferred from tokens and percentage.

## Token bar and legend

The bar is built from `breakdownSegments()` and `renderBar()`.

Segments:

| Segment      | Source                                                                                    |
| ------------ | ----------------------------------------------------------------------------------------- |
| System       | `ctx.getSystemPrompt()` token estimate, falling back to `session_meta.systemPromptTokens` |
| Compartments | Token estimate from stored compartments                                                   |
| Facts        | Token estimate from session facts                                                         |
| Memories     | Token estimate from `session_meta.memory_block_cache`                                     |
| Conversation | Remaining input tokens after subtracting known buckets                                    |
| Tool Calls   | `session_meta.toolCallTokens`                                                             |
| Tool Defs    | Token estimate from `pi.getAllTools()` tool names, descriptions, and parameters           |

Cached first paint does not compute all buckets. It fills the cheap buckets and lets the immediate full refresh replace the detail.

## Counts line

```text
Counts: 24 compartments · 4 facts · 23 memories (19 injected) · 0 notes
```

Fields:

- compartment count from `getCompartments()`,
- fact count from `getSessionFacts()`,
- project memory count from `getMemoryCount()`,
- injected memory block count from `session_meta.memory_block_count`,
- note count from active session notes plus ready smart notes.

Cached first paint uses zero for counts that require full reads.

## Historian

```text
Historian: idle
```

Fields:

- running state from `session_meta.compartmentInProgress`,
- failure count from `session_meta.historian_failure_count`,
- last failure timestamp from `session_meta.historian_last_failure_at`,
- last error from `session_meta.historian_last_error`.

## Pending drops

```text
Pending drops: 2
```

From the `pending_ops` table for the current session.

## Cache TTL

```text
Cache TTL: 5m · last response 7s ago · 293s remaining
```

Fields:

- cache TTL from `session_meta.cacheTtl`, defaulting to `5m`,
- last response time from `session_meta.lastResponseTime`,
- remaining time from `parseTtlString(cacheTtl) - elapsed`,
- expired state when remaining time reaches zero.

## Tags

```text
Tags
Active 922 (~321.9KB) · Dropped 779 · Total 1701
```

Fields come from `getTagsBySession()`:

- active tags: tags with status `active`,
- dropped tags: tags with status `dropped`,
- total tags: all session tags,
- active bytes: sum of active `byteSize` values.

## Rolling nudges and context

```text
Execute threshold 65% · Anchor 138.2K tok · Interval 10K tok · Next 148.2K tok
Protected tags 20 · Subagent no · History block ~4.7K tok · Budget ~26.5K tok (18% used)
```

Fields:

- execute threshold from `resolveExecuteThresholdDetail()`,
- anchor from `session_meta.lastNudgeTokens`,
- interval from `nudge_interval_tokens`,
- next from anchor plus interval,
- protected tags from `protected_tags`,
- subagent state from `session_meta.isSubagent`,
- history block tokens from compartment tokens plus fact tokens,
- compression budget from `contextLimit × executeThreshold × history_budget_percentage`,
- compression usage from history block tokens divided by compression budget.

## Error lines

When present, these are shown near the bottom:

- `session_meta.lastTransformError`,
- `session_meta.historian_last_error`.

## Footer and keys

```text
Press Escape to close
```

Handled keys:

- Escape,
- Enter,
- Ctrl+C.

All three close the overlay through the component's `done(undefined)` callback.
