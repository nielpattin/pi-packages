# quality-gates Specification

## Purpose

TBD - created by archiving change modernize-pi-packages-repo. Update Purpose after archive.

## Requirements

### Requirement: Node 24 CI gate

The repository SHALL provide GitHub Actions CI for Node 24 using pnpm setup, pnpm cache, frozen lockfile install, and the main verification commands.

#### Scenario: CI validates the repository

- **WHEN** CI runs for a push or pull request
- **THEN** it installs dependencies with frozen lockfile mode and runs check, test, and coverage validation

### Requirement: Coverage thresholds are enforced

Vitest coverage SHALL define global thresholds that are below current measured coverage and are enforced by `pnpm coverage`.

#### Scenario: Coverage gate runs

- **WHEN** `pnpm coverage` runs
- **THEN** it exits successfully with current coverage and would fail if global coverage drops below configured thresholds

### Requirement: Hooks match documented local gates

Repository hooks SHALL run the same documented local quality gates without using unsupported package managers or stale commands.

#### Scenario: Developer pushes changes

- **WHEN** git hooks run during commit and push
- **THEN** pre-commit runs `pnpm check` and pre-push runs `pnpm test`

### Requirement: CI validates without build

CI SHALL run install, check, test, and coverage on Node 24 without a build step.

#### Scenario: CI workflow inspection

- **WHEN** `.github/workflows/ci.yml` is inspected
- **THEN** it runs check, test, and coverage validation without a build step

### Requirement: Release validates package tarball

Release automation SHALL run check, test, coverage, and target package pack dry-run before versioning.

#### Scenario: Release gate inspection

- **WHEN** `scripts/release.mjs` is inspected
- **THEN** it gates releases with `pnpm --dir packages/<pkg> pack --dry-run` and no build command

### Requirement: Publish workflow validates package tarball

The publish workflow SHALL run check, test, coverage, and pack dry-run before publishing the selected package from `packages/<pkg>`.

#### Scenario: Publish workflow inspection

- **WHEN** `.github/workflows/publish.yml` is inspected
- **THEN** it publishes with `pnpm --dir packages/${{ inputs.package }} publish --access public --no-git-checks` after validation
