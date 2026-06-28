---
"@nielpattin/pi-permission-system": patch
---

Edit permission dialog no longer renders the diff (it lives in the chat
transcript via the edit tool's own renderCall) and the session-approval
option now shows an absolute directory path.

- Removed the edit diff from the permission dialog message. The dialog
  (rendered as a bold accent title by Pi's ExtensionSelectorComponent)
  now carries only the ask text + options. The diff is shown in the chat
  by the edit tool's renderCall, mirroring OpenCode where the diff lives
  in the chat/body, not the status header.
- `formatEditInputForPrompt` returns path-only (no replacement-count
  summary); the diff carries all detail.
- `deriveApprovalPattern` now resolves the path to an absolute,
  case-preserving form before deriving the glob, so the "for this session"
  option reads `Yes, allow edit "C:/Users/.../proj/*" for this session`
  instead of the bare relative `./*`. Same directory-scoped scope (narrower
  than OpenCode's catch-all `*`), clearer label.
