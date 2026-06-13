---
"@nielpattin/pi-subagents": patch
---

fix: use session cwd instead of process.cwd()

Several places used `process.cwd()` instead of the active session's `ctx.cwd`,
causing cwd-stickiness across session switches. The affected classes now accept
`string | (() => string)` for cwd parameters so they always resolve the current
value from the mutable `currentCwd` closure that updates on `session_start`.

Affected classes: SettingsManager, AgentManager, GitWorktreeManager,
AgentConfigEditor, AgentCreationWizard, AgentsMenuHandler.
