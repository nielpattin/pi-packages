---
"@nielpattin/pi-subagents": patch
---

fix(pi-subagents): gate project agents on trust

Project `.pi/agents/*.md` are now only loaded when `ctx.isProjectTrusted()` returns true during session_start. Global agents always load regardless of trust state.
