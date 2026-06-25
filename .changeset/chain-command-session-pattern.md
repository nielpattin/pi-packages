---
"@nielpattin/pi-permission-system": patch
---

Fix session-approval suggestion for chained bash commands. Previously a command like `cd pkg && git push` produced a `cd *` session pattern that whitelisted the benign prefix and, via the trailing-`*` optional match, silently approved arbitrary chains (`cd x && rm -rf /`). Now chained commands (containing `&&`, `||`, `;`, `|`, `&`) derive the session pattern from the matched rule that triggered the prompt, and the "for this session" option is hidden entirely when no specific rule exists (catch-all `*` or implicit ask).
