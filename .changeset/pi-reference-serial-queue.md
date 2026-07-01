---
"@nielpattin/pi-reference": patch
---

Redesign git sync UX: serial queue, single progress widget, batched error summary.

- **Serial queue**: All git operations now run one at a time through a serial queue. Previously, all git references fired concurrent `git clone`/`git fetch` processes on session start, causing `getaddrinfo() thread failed to start` errors on Windows when many references were configured (16+ concurrent git processes exhausting the DNS thread pool).
- **Single progress widget**: One line above the editor shows a counter (`⠋ Syncing references... 3/16`) that updates as each repo finishes. No per-repo flickering between clone messages.
- **Batched error summary**: Network errors (DNS failures, connection timeouts, etc.) are collected across all repos and shown as a single warning toast at the end of sync (`3 of 16 references failed to sync: owner/repo, ...`) instead of spamming one error toast per repo.
- **Background fetch is silent**: Existing repos (already cloned from a previous session) fetch silently. Only the progress counter reflects activity; no per-repo toasts for routine fetches.
