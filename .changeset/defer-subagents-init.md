---
"@nielpattin/pi-subagents": patch
---

perf(pi-subagents): defer heavy initialization to reduce startup time

- Move heavy module loading (agent-runner, worktree, etc.) from static to dynamic imports
- Defer settings.load() from load-time to session_start
- Defer custom agent loading (AgentTypeRegistry.reload) from constructor to session_start
- Defer resolveLeanMagicContextEntry() to first agent spawn
- Defer NotificationManager, ConcurrencyQueue, AgentManager, etc. construction to session_start
- Use shared mutable deps object pattern so tool execute methods resolve deps lazily
- AgentTool, GetResultTool, SteerTool now accept deps objects filled by lazy initialization

Reduces extension startup overhead by ~6% (~41ms).
