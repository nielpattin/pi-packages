## ADDED Requirements

### Requirement: CI validates without build

CI SHALL run install, check, test, and coverage on Node 24 without a build step.

#### Scenario: CI workflow inspection

- **WHEN** `.github/workflows/ci.yml` is inspected
- **THEN** it runs check, test, and coverage validation without a build step

### Requirement: Release validates package tarball

Release automation SHALL run check, test, coverage, and target package pack dry-run before versioning.

#### Scenario: Release gate inspection

- **WHEN** `scripts/release.mjs` is inspected
- **THEN** it gates releases with `pnpm --dir packages/<pkg> pack --dry-run` and no build command

### Requirement: Publish workflow validates package tarball

The publish workflow SHALL run check, test, coverage, and pack dry-run before publishing the selected package from `packages/<pkg>`.

#### Scenario: Publish workflow inspection

- **WHEN** `.github/workflows/publish.yml` is inspected
- **THEN** it publishes with `pnpm --dir packages/${{ inputs.package }} publish --access public --no-git-checks` after validation
