# Changelog

This file summarizes the latest package changelog entries. Package changelogs remain the source of truth for package-specific history.

<!-- package-changelog-summary -->

### @nielpattin/pi-magic-context

## [0.1.0] - 2026-06-02

### Added

- Initial local Pi Magic Context extension package.
- Expanded `/ctx-status` demo mode with separate handled edge-case screens for config recovery, storage warnings, embedding fallback, auto-search timeout, Historian failures, compaction marker retry, overflow recovery, Dreamer failures, transform warnings, and cache expiry.
- Added `/ctx-historian` command showing historian state, stored compartments/facts, failure info, and recent log events.

### Fixed

- Made `/ctx-status` render a cached first paint before collecting full status details, keeping the centered overlay responsive while preserving live refresh.
- Proactive historian trigger now caps at ~171K tokens for models with context > 272K, instead of firing at 63% of full context (630K for 1M models). Formula: `(min(contextLimit, 272K) / contextLimit) * (executeThreshold - 2)`.
- Bypass protected-tail gate when usage >= 80% so force-80 trigger can fire even when all messages are protected (fewer than 5 user turns).
- Use proactiveTriggerPercentage instead of executeThreshold for post-drop target comparison, fixing proactive trigger never firing on large-context models where projected post-drop was always below 48.75%.
- Prefer `usageContextLimit` from session_meta over models cache when it is larger, ensuring accurate context window for non-cached models.
- Skip projected-post-drop gate when scheduler defers drops, fixing historian never triggering because drops were counted as "will fix" but never actually applied.

### pi-multi-auth

## 0.10.0 - 2026-06-01

### Added

- Added delegated auth broker support with `PI_DELEGATED_AUTH_*` runtime environment variables and legacy fallback handling.
- Added retry-budget and half-open probe controls for credential balancing, token-weighted usage accounting, and background exclusion handling for credentials missing refresh tokens.
- Added backup recovery, atomic writes, and Windows ACL hardening for credential and state file persistence.
- Added persistent usage cache and usage coordinator robustness improvements, import handling updates, and longer Codex usage request timeouts.

### Changed

- Improved provider retry behavior with jittered exponential backoff, abortable sleeps, retry-budget integration, and token-estimate-aware success recording.
- Updated OAuth command flows for missing refresh token messaging and OmniOnboard naming.
- Widened Pi peer dependency compatibility to include Pi 0.77.x and 0.78.x and updated development tooling.

### Fixed

- Decayed stale quota errors over time with success-streak recovery so recovered credentials can return to rotation.
- Improved auth writer and storage recovery from partial or corrupted snapshots.

### Removed

- Removed unused carousel and quota bar formatter code.

### @nielpattin/pi-permission-system

## [0.1.0] - 2026-05-29

### Added

- Initial `@nielpattin/pi-permission-system` package.
- Imported permission enforcement extension source, tests, config example, schema, and user-facing docs from `@gotgenes/pi-permission-system`.
- Updated package metadata, docs, and service key for the `@nielpattin` scope.
- Documented interoperability with `@nielpattin/pi-subagents`.

### Attribution

- Based on [`@gotgenes/pi-permission-system`](https://github.com/gotgenes/pi-packages/tree/main/packages/pi-permission-system).
- `@gotgenes/pi-permission-system` is based on [`MasuRii/pi-permission-system`](https://github.com/MasuRii/pi-permission-system).

### @nielpattin/pi-simplify

## 0.2.7

### Patch Changes

- 7424211: Modernize release and publish metadata for the pnpm and Node 24 Changesets workflow.

### @nielpattin/pi-station

## 0.6.6

### Patch Changes

- 7424211: Modernize release and publish metadata for the pnpm and Node 24 Changesets workflow.

### @nielpattin/pi-subagents

## 0.1.0

### Added

- Initial `@nielpattin/pi-subagents` package.
- Imported subagent spawning, background execution, steering, result retrieval, custom agent definitions, and the `/agents` management UI from the upstream fork lineage.

### Changed

- Renamed package metadata, repository links, install instructions, and service key for the `@nielpattin` npm scope.
- Pruned upstream planning docs, media, and package-local lint tooling that do not apply to this monorepo.

### Attribution

- Based on `@gotgenes/pi-subagents`, itself a friendly fork of `@tintinweb/pi-subagents`.

<!-- /package-changelog-summary -->
