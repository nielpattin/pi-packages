## Why

The repository already contains multiple independent Pi extensions, but its root-level package layout and automation still read like a small starter repo. Moving to a `packages/*` workspace and adding Node 24 CI makes the repo easier to scale, verify, and release safely.

## What Changes

- Move `pi-caveman`, `pi-simplify`, and `pi-station` under `packages/`.
- Update workspace, TypeScript, Vitest, formatting, linting, validation, publish, release, README, and GitHub workflow paths for the new structure.
- Add Node 24 CI that installs with pnpm and runs check, tests, and coverage.
- Fix Vitest coverage thresholds so coverage gates are actually enforced with realistic initial global thresholds.
- Strengthen per-package release automation with full pre-release gates and changelog validation.
- Align hooks and documentation with the actual local quality gates.
- Keep package publishing explicit and defer raw TypeScript decisions to a follow-up change.

## Capabilities

### New Capabilities

- `workspace-layout`: Package workspaces, scripts, config, and metadata SHALL use the `packages/*` layout for independent Pi extensions.
- `quality-gates`: CI, hooks, and coverage SHALL run enforceable Node 24 pnpm quality gates.
- `package-release`: Per-package release automation SHALL validate the repo before versioning and publishing.
- `repository-documentation`: README and package docs SHALL describe the independent extension repo, package map, and current workflows.

### Modified Capabilities

## Impact

Affected files include package directories, workspace config, root scripts, package metadata, TypeScript/Vitest/oxlint/oxfmt config, GitHub Actions, Husky hooks, README files, pnpm lockfile, and OpenSpec change artifacts. Package runtime APIs remain unchanged.
