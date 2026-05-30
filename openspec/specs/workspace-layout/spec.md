# workspace-layout Specification

## Purpose

TBD - created by archiving change modernize-pi-packages-repo. Update Purpose after archive.

## Requirements

### Requirement: Package directories use packages workspace

The repository SHALL place each independent Pi extension package under `packages/<package-name>` and configure pnpm and package manager workspace metadata to include `packages/*`.

#### Scenario: Workspace package discovery

- **WHEN** workspace tooling resolves repository packages
- **THEN** it discovers `packages/pi-caveman`, `packages/pi-simplify`, and `packages/pi-station`

### Requirement: Tooling references package paths consistently

Repository tooling SHALL reference package paths through the `packages/<package-name>` layout for tests, coverage, pack dry-runs, publishing, release automation, TypeScript, Vitest, linting, formatting, and GitHub workflows.

#### Scenario: Validate all packages

- **WHEN** repository validation runs
- **THEN** it validates package projects from `packages/*` without relying on root-level package directories

### Requirement: Package metadata points to moved packages

Each package manifest SHALL set repository and homepage paths that point to `packages/<package-name>`.

#### Scenario: Package metadata inspection

- **WHEN** a package manifest is inspected
- **THEN** repository directory and homepage paths refer to the package's `packages/<package-name>` location
