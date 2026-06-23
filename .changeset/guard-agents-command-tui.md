---
"@nielpattin/pi-subagents": patch
---

Guard `/agents` command to only work in TUI mode. In print/RPC mode, it now sends a message and returns early instead of attempting interactive UI operations that would fail.
