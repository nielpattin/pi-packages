---
"@nielpattin/pi-magic-context": minor
---

refactor: replace auto-compressor with a detached recomp runner

- Delete `src/pi-compressor-runner.ts` and add a detached, fire-and-forget `pi-recomp-runner` that mirrors the historian pattern (plus `pi-recomp-client-shared`, `pi-recomp-marker`, and a `storage` re-export). Recomp/upgrade now runs in the background so the Pi REPL stays responsive instead of blocking on multi-pass historian runs.
- Remove `maybeFireCompressor`, `inFlightCompressor`, `clearPiCompressorState`, `hasEligiblePiCompartmentHistory`, and the dead `resolveHistoryBudgetTokensForPi` from `context-handler.ts` and `ctx-recomp.ts`.
- Revert the 272K large-context proactive-trigger cap; the proactive floor is again a pure percentage of the execute threshold (callers and tests updated).
- Relocate the magic-context storage directory to `getDataDir()/cortexkit/magic-context`.
- Drop the Bun static-analyzer string-splitting workarounds in `embedding-local.ts`.
