# repository-documentation Specification

## Purpose

TBD - created by archiving change modernize-pi-packages-repo. Update Purpose after archive.

## Requirements

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

### Requirement: README documents raw TypeScript publishing

The README SHALL explain that packages publish raw TypeScript and Pi loads `.ts` extensions via jiti.

#### Scenario: User reads package model

- **WHEN** a user reads the README
- **THEN** they understand why there is no build step or `dist` output

### Requirement: README documents current validation

The README SHALL describe validation as install, check, test, coverage, and package pack dry runs without build commands.

#### Scenario: Contributor follows README

- **WHEN** a contributor follows README validation and release instructions
- **THEN** they do not run stale build commands
