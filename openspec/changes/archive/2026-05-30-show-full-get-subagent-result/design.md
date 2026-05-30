## Context

`get_subagent_result` retrieves the stored result for a background subagent. Its tool result currently accepts `verbose`, appends the child session conversation when enabled, and renders through the shared `renderAgentResult` path. That shared renderer caps expanded completed output at 50 lines and appends a hint that says to use `get_subagent_result` with `verbose` for full output.

That behavior is appropriate for compact display in the original `subagent` tool path, but it is wrong for `get_subagent_result` itself. When the user expands a `get_subagent_result` tool row, they are asking to inspect the retrieved result in the UI. The expanded view should show all result lines and should not suggest a second tool call or a `verbose` option.

## Goals / Non-Goals

**Goals:**

- Remove `verbose` from the `get_subagent_result` public schema and execution parameter shape.
- Remove the conversation-appending behavior currently guarded by `params.verbose`.
- Render expanded `get_subagent_result` results without the 50-line cap.
- Render expanded `get_subagent_result` results without any overflow hint.
- Keep collapsed `get_subagent_result` output compact.
- Keep `subagent` foreground result rendering behavior unchanged unless a small shared helper option is needed.

**Non-Goals:**

- Do not change background agent execution, storage, lifecycle, notifications, or result consumption semantics.
- Do not change how the LLM receives the `get_subagent_result` tool content except for removal of optional verbose conversation text.
- Do not add a new replacement parameter for full conversation retrieval.
- Do not change the `subagent` tool schema.

## Decisions

### Give `get_subagent_result` its own expanded rendering behavior

Use a renderer path for `get_subagent_result` that can render all lines in expanded mode. This can be implemented either by adding options to the shared completed-result renderer or by adding a small renderer in `get-result-tool.ts` that reuses status and stats helpers where practical.

Rationale: `get_subagent_result` has different UI semantics from the original `subagent` tool result. Expanded view for retrieval should prioritize completeness over compactness.

Alternative considered: Keep the shared 50-line cap and only change the hint. This would leave the user-visible result truncated, which does not meet the requested behavior.

### Remove `verbose` instead of redefining it

Delete the `verbose` schema property, remove it from TypeScript parameter types, and remove the code path that appends `--- Agent Conversation ---`.

Rationale: The user request is to remove verbose and make expansion show the output. Keeping `verbose` would preserve a confusing distinction between final result display and full conversation display.

Alternative considered: Keep `verbose` but hide it from the prompt. That would leave an unsupported hidden API and keep behavior that is no longer part of the desired contract.

### Keep collapsed rendering compact

Collapsed `get_subagent_result` should still show a status summary such as done, running, stopped, or error. Full result text belongs only in expanded mode.

Rationale: Pi tool rows are normally compact by default. Showing full result text while collapsed would make long background results noisy and hard to navigate.

## Risks / Trade-offs

- Large expanded result output may take more terminal space → This is intentional for explicit expansion, while collapsed mode remains compact.
- Existing callers may pass `verbose` → Removing it from the schema can reject old calls. This is acceptable because the change intentionally removes the parameter, but resumed older sessions may still contain old arguments. If resume compatibility is needed, handle `verbose` in `prepareArguments` or accept that old stored calls may not revalidate.
- Shared renderer changes could alter `subagent` output → Prefer a targeted `get_subagent_result` renderer option or separate helper path, and cover `subagent` renderer tests if shared code changes.
- Removing full conversation retrieval may reduce debugging detail → The requested contract removes `verbose`; future debugging transcript access should be a separate explicit feature if needed.
