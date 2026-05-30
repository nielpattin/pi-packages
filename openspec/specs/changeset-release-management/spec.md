# changeset-release-management Specification

## Purpose

TBD - created by archiving change streamline-release-publish-workflow. Update Purpose after archive.

## Requirements

### Requirement: Changesets configuration

The repository SHALL provide Changesets configuration for independent public package versioning on the `main` branch.

#### Scenario: Independent package versions

- **WHEN** package versioning is prepared with Changesets
- **THEN** packages SHALL be versioned independently rather than through fixed or linked version groups

#### Scenario: Public package metadata

- **WHEN** Changesets generates package version updates
- **THEN** package publishing metadata SHALL default to public access

### Requirement: Changeset authoring scripts

The repository SHALL expose pnpm scripts for creating changesets, applying version updates, and publishing with Changesets.

#### Scenario: Creating a changeset

- **WHEN** a contributor runs the changeset authoring script
- **THEN** the script SHALL invoke the Changesets CLI through pnpm-managed dependencies

#### Scenario: Versioning packages

- **WHEN** a contributor runs the package versioning script
- **THEN** the script SHALL apply Changesets version updates and refresh generated changelog summaries

### Requirement: Local changeset gate

The repository SHALL provide a local gate that requires a changeset for package-impacting changes.

#### Scenario: Package files changed without changeset

- **WHEN** files under `packages/*` changed relative to the selected base ref and no `.changeset/*.md` file changed
- **THEN** the gate SHALL fail with guidance to add a changeset or explicitly skip the gate

#### Scenario: Package files changed with changeset

- **WHEN** files under `packages/*` changed relative to the selected base ref and a `.changeset/*.md` file changed
- **THEN** the gate SHALL pass

#### Scenario: Emergency skip

- **WHEN** `SKIP_CHANGESET_CHECK=1` or `SKIP_HOOKS=1` is set
- **THEN** the gate SHALL skip changeset enforcement

### Requirement: Release documentation

The repository SHALL document the Changesets release flow, local validation source, tag convention, and legacy release-script status.

#### Scenario: Contributor reads release docs

- **WHEN** a contributor reads the repository release instructions
- **THEN** the docs SHALL explain how to add changesets, version packages, publish exact package tags, and avoid redundant GitHub validation
