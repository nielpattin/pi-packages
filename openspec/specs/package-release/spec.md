# package-release Specification

## Purpose

TBD - created by archiving change modernize-pi-packages-repo. Update Purpose after archive.

## Requirements

### Requirement: Releases remain per-package

The release automation SHALL release exactly one target package at a time and SHALL NOT adopt a lockstep versioning model.

#### Scenario: Release target selected

- **WHEN** release automation is invoked with a package name
- **THEN** only that package's manifest and changelog are versioned for the requested release

### Requirement: Release gate validates repository health

Before versioning a package, release automation SHALL run check, test, coverage, and target package pack dry-run validation.

#### Scenario: Pre-release gate runs

- **WHEN** release automation starts
- **THEN** it executes the required root verification commands before changing package version files

### Requirement: Release validates package changelog

Before versioning a package, release automation SHALL verify the target package changelog contains `## [Unreleased]` and SHALL warn if the unreleased section contains no bullet entries.

#### Scenario: Empty unreleased changelog

- **WHEN** a package changelog has an `## [Unreleased]` heading but no bullet entries before the next release heading
- **THEN** release automation warns before continuing
