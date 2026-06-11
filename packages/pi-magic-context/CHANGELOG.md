# Changelog

All notable changes to this package will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this package follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
