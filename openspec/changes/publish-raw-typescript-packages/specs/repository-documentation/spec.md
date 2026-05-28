## ADDED Requirements

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
