# Tools

Tools are registered by `registerMagicContextTools()` in `src/tools/index.ts`.

## Registered tools

| Tool         | Source                    | Registered when               |
| ------------ | ------------------------- | ----------------------------- |
| `ctx_search` | `src/tools/ctx-search.ts` | Always                        |
| `ctx_memory` | `src/tools/ctx-memory.ts` | Always                        |
| `ctx_note`   | `src/tools/ctx-note.ts`   | Always                        |
| `ctx_expand` | `src/tools/ctx-expand.ts` | Always                        |
| `todowrite`  | `src/tools/todowrite.ts`  | Always                        |
| `ctx_reduce` | `src/tools/ctx-reduce.ts` | `ctx_reduce_enabled === true` |

## `ctx_search`

Searches across Magic Context sources.

Parameters:

```ts
{
  query: string;
  limit?: number;
  sources?: Array<"memory" | "message" | "git_commit">;
}
```

Sources:

- `memory`: project memories,
- `message`: raw conversation history,
- `git_commit`: indexed git commits when git commit indexing is enabled.

The tool resolves the current session ID and project identity from the Pi command context. It delegates search to `unifiedSearch()` in `core/features/magic-context/search`.

## `ctx_memory`

Writes and manages project-scoped memories.

Parameters include:

```ts
{
  action: "write" | "delete" | "list" | "update" | "merge" | "archive";
  content?: string;
  category?: string;
  id?: number;
  ids?: number[];
  limit?: number;
  reason?: string;
}
```

Always-allowed actions:

- `write`: insert a new memory or bump seen count on dedup hit,
- `delete`: soft-delete a memory by archiving it.

Dreamer-only actions:

- `list`,
- `update`,
- `merge`,
- `archive`.

The wider action surface is enabled only for subagent sessions launched with the dreamer action flag. The main extension registers `ctx_memory` with dreamer-only actions disabled.

Memory categories come from `CATEGORY_PRIORITY` in the memory runtime.

## `ctx_note`

Stores and reads durable notes.

Parameters include:

```ts
{
  action?: "write" | "read" | "dismiss" | "update";
  content?: string;
  surface_condition?: string;
  note_id?: number;
  filter?: "active" | "pending" | "ready" | "dismissed" | "all";
}
```

Actions:

- `write`: create a session note, or a smart note when `surface_condition` is present,
- `read`: read active session notes plus ready smart notes by default,
- `dismiss`: dismiss a note by ID,
- `update`: update a note by ID.

Smart notes are project-scoped and require dreamer to be enabled. When dreamer is disabled, smart-note writes are rejected so a note cannot remain permanently pending without an evaluator.

## `ctx_expand`

Expands a compartment range back into raw transcript text.

Parameters:

```ts
{
   start: number;
   end: number;
}
```

The range corresponds to attributes from a compartment block:

```xml
<compartment start="N" end="M" title="...">
```

The tool registers a Pi raw-message provider for the current session for the duration of the call, reads the requested range through the shared `readSessionChunk()` path, then unregisters the provider in `finally`.

The expansion token budget is `CTX_EXPAND_TOKEN_BUDGET` from the shared ctx-expand constants.

## `ctx_reduce`

Queues tag drops.

Parameters:

```ts
{
  drop?: string;
}
```

`drop` accepts IDs and ranges such as:

```text
3-5
1,2,9
1-5,8,12-15
```

The tool is only registered when `ctx_reduce_enabled` is `true`.

When disabled:

- `ctx_reduce` is not registered,
- tag prefix injection is disabled upstream,
- prompt guidance omits reduce instructions.

## `todowrite`

Pi parity tool for task list state.

Parameters:

```ts
{
   todos: Array<{
      content: string;
      status: "pending" | "in_progress" | "completed" | "cancelled";
      id?: string;
      priority?: "low" | "medium" | "high";
   }>;
}
```

The tool returns a pretty-printed acknowledgement. `src/index.ts` captures the last todo state during message/tool lifecycle handling and stores it in `session_meta` for later synthetic todo injection.
