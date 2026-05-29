## Why

The repository currently relies on a custom one-package release script and GitHub workflows that repeat full validation even though local Husky hooks are the intended validation source. Moving to Changesets gives independent package versioning, generated changelogs, and clearer manual publish boundaries while preserving raw TypeScript publishing.

## What Changes

- Introduce a Changesets-based versioning flow for independent package versions, generated package changelogs, and public package publishing metadata.
- Separate local validation from GitHub publishing so workflows do not rerun `pnpm check`, `pnpm test`, or `pnpm coverage` as a default release gate.
- Simplify manual publishing around exact package/tag verification, package dry-run, and publish without redundant full validation.
- Add a local changeset-required gate for package-impacting changes so version intent is captured before push.
- Add a generated root changelog summary that links the latest package changelog entries.
- Evaluate aggregate collection packages for pi extensions and skills, but only implement publishable aggregates when pi package path semantics are verified.
- Normalize publishable package manifests for Node 24 and raw TypeScript packaging expectations.
- Document the release/publish separation, tag convention, local validation source, and migration path away from the legacy release script.

## Capabilities

### New Capabilities

- `changeset-release-management`: Changesets-based package versioning, generated package changelogs, release documentation, and local changeset enforcement.
- `manual-package-publishing`: Manual workflow for publishing an exact package version or tag without repeating full validation.
- `monorepo-changelog-summary`: Generated root changelog summary derived from package changelogs.
- `aggregate-package-collections`: Optional aggregate collection package model for pi extensions and skills, gated by verified pi package path semantics.

### Modified Capabilities

## Impact

- Root package scripts and dev dependencies.
- `.changeset/` configuration and usage documentation.
- GitHub workflows for CI, release, and publish behavior.
- Husky pre-push hook behavior.
- Release and changelog helper scripts under `scripts/`.
- Package manifests under `packages/*/package.json`.
- Root and package release documentation.
