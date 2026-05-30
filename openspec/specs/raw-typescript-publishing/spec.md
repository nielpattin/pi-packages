# raw-typescript-publishing Specification

## Purpose

TBD - created by archiving change publish-raw-typescript-packages. Update Purpose after archive.

## Requirements

### Requirement: Packages expose TypeScript entrypoints

Each package SHALL set `main` and `pi.extensions` to its TypeScript source entrypoint instead of `dist` JavaScript.

#### Scenario: Package manifest inspection

- **WHEN** a package manifest is inspected
- **THEN** its runtime entrypoints refer to `.ts` source files and not generated JavaScript entrypoints

### Requirement: Packages include source in publish files

Each package SHALL include the TypeScript source files and package documentation needed for raw TypeScript publishing.

#### Scenario: Package dry run

- **WHEN** `pnpm --dir packages/<pkg> pack --dry-run` runs
- **THEN** the tarball contents include required `.ts` source files and do not include `dist`

### Requirement: Build artifacts are removed

The repository SHALL remove build-only package configs and root build helpers from the active workflow.

#### Scenario: Stale build reference check

- **WHEN** repository files are searched for build-only config and build script references
- **THEN** no active package, workflow, release, or README documentation relies on them
