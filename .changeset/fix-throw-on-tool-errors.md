---
"@nielpattin/pi-subagents": patch
---

fix: throw on tool execution failures instead of returning text results

Tool `execute()` methods now throw on genuine errors (agent not found, config resolution failure, resume failure, steer failure) instead of returning `textResult(...)`. This produces proper `isError: true` results per Pi SDK semantics.
