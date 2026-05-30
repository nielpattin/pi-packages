# @nielpattin/pi-subagents

Pi extension for spawning and managing autonomous subagents from a parent Pi session.

This package is maintained in [`nielpattin/pi-packages`](https://github.com/nielpattin/pi-packages). It is based on [`@gotgenes/pi-subagents`](https://github.com/gotgenes/pi-packages/tree/main/packages/pi-subagents), which is based on [`@tintinweb/pi-subagents`](https://github.com/tintinweb/pi-subagents).

## Features

- Spawn foreground or background subagents from Pi tool calls.
- Retrieve background results with `get_subagent_result`.
- Steer running background agents with `steer_subagent`.
- Configure custom agent types from `.pi/agents/<name>.md` or the global Pi agent directory.
- Use the `/agents` command to view running agents, inspect conversations, and manage agent definitions.
- Run agents in isolated git worktrees when `isolation: "worktree"` is requested.
- Publish a typed cross-extension service through `@nielpattin/pi-subagents`.
- Integrate with `@nielpattin/pi-permission-system` through child session lifecycle events when both packages are installed.

## Install

```bash
pi install npm:@nielpattin/pi-subagents
```

For local development from this monorepo:

```bash
pi -e ./packages/pi-subagents/src/index.ts
```

## Tools

### `subagent`

Spawn a subagent.

```text
subagent({
   subagent_type: "Explore",
   prompt: "Find the authentication entrypoints",
   description: "Find auth entrypoints",
   run_in_background: true,
})
```

Common options:

- `subagent_type`: agent type name. Built-ins include `general-purpose`, `Explore`, and `Plan`.
- `prompt`: task prompt for the child agent.
- `description`: short label shown in the UI.
- `run_in_background`: return immediately with an agent id.
- `inherit_context`: include the parent conversation in the child session.
- `model`: model override such as `haiku` or `sonnet`.
- `thinking`: thinking level override.
- `max_turns`: child turn limit.
- `isolation: "worktree"`: run in a temporary git worktree.

### `get_subagent_result`

Check status and retrieve results from a background agent.

```text
get_subagent_result({ agent_id: "agent-abc123", wait: true })
```

### `steer_subagent`

Send a message into a running background agent.

```text
steer_subagent({
   agent_id: "agent-abc123",
   message: "Focus on the auth middleware first.",
})
```

## Custom agents

Create a Markdown file at `.pi/agents/<name>.md`:

```markdown
---
description: Security code reviewer
tools: read, grep, find, bash
model: anthropic/claude-sonnet-4-5
thinking: high
max_turns: 30
---

You are a security reviewer. Report vulnerabilities with file paths, severity, and remediation advice.
```

Then spawn it by name:

```text
subagent({ subagent_type: "security", prompt: "Review the auth module", description: "Security review" })
```

Project agents in `.pi/agents/` override global agents from the Pi agent directory.

## Cross-extension service

Consumers can import the typed service accessor:

```ts
const { getSubagentsService } = await import("@nielpattin/pi-subagents");
const service = getSubagentsService();
```

The service is published under `Symbol.for("@nielpattin/pi-subagents:service")` while the extension is active.

## Development

```bash
pnpm --dir packages/pi-subagents test
pnpm --dir packages/pi-subagents check
pnpm --dir packages/pi-subagents pack --dry-run
```

Run from the repository root for full workspace validation:

```bash
pnpm check
pnpm test
```

## Attribution

MIT licensed. Original copyright remains with tintinweb. This package keeps that license notice and documents the fork lineage through `@gotgenes/pi-subagents`.
