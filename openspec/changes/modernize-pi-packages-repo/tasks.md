## 1. Workspace Layout

- [x] 1.1 Move `pi-caveman`, `pi-simplify`, and `pi-station` into `packages/` preserving tracked changes.
- [x] 1.2 Update pnpm workspace and root workspace metadata to use `packages/*`.
- [x] 1.3 Update package manifest repository and homepage paths to `packages/<package>`.
- [x] 1.4 Update TypeScript, Vitest, oxlint, oxfmt, build, publish, release, and GitHub workflow paths for the new layout.
- [x] 1.5 Refresh pnpm lockfile if workspace changes require it.

## 2. Quality Gates

- [x] 2.1 Add Node 24 CI using pnpm/action-setup v4, Node 24, pnpm cache, frozen lockfile install, check, test, and build.
- [x] 2.2 Fix Vitest coverage thresholds with realistic enforced global values.
- [x] 2.3 Align hooks so pre-commit runs `pnpm check` and pre-push runs `pnpm test`.

## 3. Release Automation

- [x] 3.1 Keep per-package release behavior and package-specific versioning.
- [x] 3.2 Add pre-release gate commands: check, test, coverage, and target package pack dry-run.
- [x] 3.3 Add changelog validation for `## [Unreleased]` and warning for empty unreleased bullet entries.
- [x] 3.4 Preserve safe `spawnSync` usage for git and pnpm commands.

## 4. Documentation

- [x] 4.1 Update README narrative, badges, package map, project tree, Node 24 note, hooks, and build/release/publish docs.
- [x] 4.2 Update package READMEs and path references as needed.
- [x] 4.3 Document that raw TypeScript publish is deferred until a one-package Pi loading spike verifies behavior.

## 5. Verification

- [x] 5.1 Run `pnpm install --frozen-lockfile` after workspace changes.
- [x] 5.2 Run check, test, coverage, and target package pack dry-run validation.
- [x] 5.3 Run `pnpm pack --dry-run` for each package under `packages/`.
- [x] 5.4 Run stale-reference checks for root package paths, stale Node version docs, legacy ox config names, and disallowed package-manager commands.
