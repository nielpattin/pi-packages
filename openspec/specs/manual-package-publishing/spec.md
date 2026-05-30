# manual-package-publishing Specification

## Purpose

TBD - created by archiving change streamline-release-publish-workflow. Update Purpose after archive.

## Requirements

### Requirement: Manual exact package publish workflow

The repository SHALL provide a manual GitHub workflow that publishes a selected package only after checking out and verifying an exact Changesets tag.

#### Scenario: Publish from tag

- **WHEN** the publish workflow is dispatched with a package and tag
- **THEN** the workflow SHALL checkout the tag, verify the selected package exists, verify the package version matches the tag version, run package-local `pack --dry-run`, and publish only that package

### Requirement: No redundant full validation in publish

The publish workflow MUST NOT run full repository validation commands by default.

#### Scenario: Publish workflow runs

- **WHEN** the publish workflow executes
- **THEN** it SHALL NOT run `pnpm check`, `pnpm test`, or `pnpm coverage`

### Requirement: Publish trigger helper

The repository SHALL provide a local helper for dispatching the manual publish workflow for one selected package and exact tag.

#### Scenario: Dispatch selected packages

- **WHEN** a contributor invokes the helper with a package name and tag
- **THEN** the helper SHALL validate the package directory locally and dispatch the publish workflow with the selected package and tag inputs
