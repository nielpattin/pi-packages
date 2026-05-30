## Why

`get_subagent_result` currently uses a display renderer that caps expanded output at 50 lines and shows a hint about using `verbose`, which is misleading because `verbose` adds the full conversation rather than controlling display truncation. Users need expanded `get_subagent_result` output to show the complete retrieved result directly, without a self-referential or inaccurate hint.

## What Changes

- Remove the `verbose` parameter from `get_subagent_result`.
- Make expanded rendering for `get_subagent_result` show the full retrieved result text instead of truncating at 50 lines.
- Do not show an overflow hint for expanded `get_subagent_result` output.
- Keep collapsed rendering compact so normal tool rows remain readable.
- Preserve the existing `subagent` tool rendering behavior unless it directly depends on shared code that must become configurable.

## Capabilities

### New Capabilities

- `subagent-result-display`: Covers how `get_subagent_result` presents retrieved background agent results in collapsed and expanded tool views.

### Modified Capabilities

## Impact

- Affected code: `packages/pi-subagents/src/tools/get-result-tool.ts`, shared result rendering helpers if needed, and related tests.
- Tool API: `get_subagent_result.verbose` is removed from the public schema and execution input.
- UI behavior: expanded `get_subagent_result` displays complete result content without the 50-line cap or hint.
- Tests: update or add tests for schema shape, collapsed rendering, expanded full rendering, and absence of the old hint.
