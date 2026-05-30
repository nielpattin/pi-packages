## ADDED Requirements

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
