## ADDED Requirements

### Requirement: README explains repository purpose

The root README SHALL explain that the repository exists for independent Pi extensions focused on developer workflow improvements.

#### Scenario: New contributor reads README

- **WHEN** a contributor opens the README
- **THEN** they can identify why the repo exists and what kind of packages it contains

### Requirement: README includes package map

The root README SHALL include a package map with package name, role, install command, npm link, and current version.

#### Scenario: User chooses a package

- **WHEN** a user reads the package map
- **THEN** they can identify what each package does and how to install it

### Requirement: Documentation matches current automation

Repository documentation SHALL describe Node 24, `packages/*`, current hooks, validation, release, and publish commands without stale Node version comments or legacy config file names.

#### Scenario: User follows documented commands

- **WHEN** a user follows README commands for install, validation, release, publish, and hooks
- **THEN** the commands match files and scripts present in the repository
