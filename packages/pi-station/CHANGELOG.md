# Changelog

## 0.7.0

### Minor Changes

- d77095c: Add cache_hit (CH%) segment, fix cost segment to show actual cost, move (auto) indicator to context_pct segment

### Patch Changes

- 3324736: Fix terminal split selection so ST-terminated OSC 8 hyperlinks keep their visible file paths highlighted and copied.
- 2dfb0b1: Update Pi host peer dependency ranges to `^0.78.0`.
- 1da0dd9: Remove pi-station's custom read tool renderer so read output uses the default tool shell.

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Added Hashline read and edit tools with pi-station read row rendering.
- Added undo/redo to the prompt editor input. Undo: Ctrl+Z (also keeps Ctrl+-). Redo: Ctrl+Y (overrides yank). Both configurable via `shortcuts.undo` and `shortcuts.redo` in station settings.

### Fixed

- Chat scrollbar now has 1 column of padding between content and scrollbar indicator.
- Cache_hit segment now uses `latestCacheHitRate` from usage stats instead of computing from cumulative tokens, matching the built-in footer display.

## 0.6.6

### Patch Changes

- 7424211: Modernize release and publish metadata for the pnpm and Node 24 Changesets workflow.

## [0.6.5] - 2026-05-28

## [0.6.2] - 2026-05-19

### Fixed

- Mouse selection now copies only visible chat text, not trailing padding cells.

## [0.6.1] - 2026-05-18

### Added

- Chat selection can now stay active while scrolling the fixed-editor chat viewport with the mouse wheel.
