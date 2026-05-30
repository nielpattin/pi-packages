# aggregate-package-collections Specification

## Purpose

TBD - created by archiving change streamline-release-publish-workflow. Update Purpose after archive.

## Requirements

### Requirement: Aggregate package evaluation

The repository SHALL evaluate aggregate package collections before adding publishable aggregate packages.

#### Scenario: Path semantics unverified

- **WHEN** pi package path semantics for dependencies have not been verified
- **THEN** the repository SHALL NOT add publishable aggregate packages that rely on cross-package extension or skill paths

#### Scenario: Path semantics verified

- **WHEN** pi package documentation or local tests prove aggregate dependency paths work after npm installation
- **THEN** aggregate packages MAY be added with generated dependencies and pi configuration paths

### Requirement: Aggregate design documentation

The repository SHALL document the intended aggregate package model and the verification required before implementation.

#### Scenario: Contributor reviews aggregate plan

- **WHEN** a contributor reads the release workflow documentation or OpenSpec design
- **THEN** the contributor SHALL see that aggregate packages are optional and gated by verified pi package semantics
