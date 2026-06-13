---
"@nielpattin/pi-subagents": patch
---

fix: use StringEnum for isolation parameter

- Replace Type.Literal("worktree") with StringEnum(["worktree"]) for the isolation parameter schema
- Type.Literal and Type.Union string enums don't work with Google's API; StringEnum is the correct approach per Pi docs
