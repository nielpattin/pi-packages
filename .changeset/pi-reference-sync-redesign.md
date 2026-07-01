---
"@nielpattin/pi-reference": patch
---

Improve git sync and system prompt guidance.

- **Parallel sync**: Git references now sync concurrently via `Promise.allSettled`. Each repo clone/fetches independently for faster startup.
- **Same-target+branch deduplication**: Two aliases pointing at the same repo+branch only trigger one git operation.
- **Animated progress widget**: A spinner (`⠋ ⠙ ⠹ ⠸ ...`) cycles every 80ms with a counter (`Syncing references... 3/16`) above the editor while sync runs. Cleared when all repos finish.
- **Batched error summary**: Network errors are collected across all repos and shown as a single warning toast at the end of sync instead of spamming one error toast per repo.
- **Guidance filtering fix**: Only `description` gates system prompt advertisement. `hidden` references WITH descriptions are still advertised to the agent; `hidden` only affects the `@` autocomplete picker.
- **Alphabetical sorting**: References in the system prompt XML are now sorted alphabetically by name.
