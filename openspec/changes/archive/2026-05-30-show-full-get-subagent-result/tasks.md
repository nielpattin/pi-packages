## 1. Tests

- [x] 1.1 Add or update `get_subagent_result` tool definition tests to assert the schema includes `agent_id` and `wait`, and omits `verbose`.
- [x] 1.2 Add a result retrieval test asserting completed output does not append an `--- Agent Conversation ---` section.
- [x] 1.3 Add expanded rendering coverage with more than 50 result lines and assert lines after line 50 are visible.
- [x] 1.4 Add expanded rendering coverage asserting no overflow hint or verbose instruction appears.
- [x] 1.5 Keep collapsed rendering coverage asserting completed result bodies stay hidden while the compact completion summary remains visible.

## 2. Tool API Cleanup

- [x] 2.1 Remove `verbose` from `GetResultTool.execute` parameter types and helper test types.
- [x] 2.2 Remove the `verbose` property from the `get_subagent_result` tool schema.
- [x] 2.3 Remove the `params.verbose` conversation-appending branch and the now-unused `getAgentConversation` import.
- [x] 2.4 Confirm existing `wait` behavior and notification consumption behavior are unchanged.

## 3. Expanded Rendering Behavior

- [x] 3.1 Add a targeted rendering path or renderer option so `get_subagent_result` expanded completed output renders every returned result line.
- [x] 3.2 Ensure `get_subagent_result` expanded output never emits the shared verbose overflow hint.
- [x] 3.3 Ensure collapsed `get_subagent_result` output remains compact for completed and steered statuses.
- [x] 3.4 Preserve existing `subagent` tool renderer behavior or update its tests if shared renderer options are introduced.

## 4. Verification

- [x] 4.1 Run `pnpm vitest run pi-subagents/test/tools/get-result-tool.test.ts`.
- [x] 4.2 Run `pnpm --dir packages/pi-subagents check`.
- [x] 4.3 Run `pnpm check` from the repository root.
