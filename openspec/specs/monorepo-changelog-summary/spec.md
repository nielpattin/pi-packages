# monorepo-changelog-summary Specification

## Purpose

TBD - created by archiving change streamline-release-publish-workflow. Update Purpose after archive.

## Requirements

### Requirement: Root changelog summary

The repository SHALL maintain a root changelog containing a generated summary of the latest package changelog entries.

#### Scenario: Summary generation

- **WHEN** the changelog sync script runs
- **THEN** it SHALL read package changelogs and update only the generated summary section in the root changelog

#### Scenario: Package without released entry

- **WHEN** a package changelog has no parseable latest released section
- **THEN** the summary generator SHALL keep the repository changelog valid and report the missing package entry clearly

### Requirement: Version flow updates summary

The package versioning script SHALL refresh the root changelog summary after package changelogs are updated.

#### Scenario: Version packages

- **WHEN** the package versioning script runs successfully
- **THEN** the root changelog summary SHALL reflect the latest package changelog sections
