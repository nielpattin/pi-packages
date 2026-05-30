## 1. Changesets Setup

- [x] 1.1 Add `@changesets/cli` and `@changesets/changelog-github` as root dev dependencies with pnpm.
- [x] 1.2 Add `.changeset/config.json` for independent public packages on `main` with GitHub changelog integration.
- [x] 1.3 Add `.changeset/README.md` with concise contributor usage.
- [x] 1.4 Add root scripts for `changeset`, `version-packages`, `release`, `changelog:sync`, and `changeset:check`.

## 2. Local Changeset Gate

- [x] 2.1 Add `scripts/require-changeset.mjs` to require `.changeset/*.md` when package-impacting files change relative to a base ref.
- [x] 2.2 Support `SKIP_CHANGESET_CHECK=1` and `SKIP_HOOKS=1` skips in the changeset gate.
- [x] 2.3 Update `.husky/pre-push` to run `pnpm test` and the changeset gate.

## 3. GitHub Workflow Simplification

- [x] 3.1 Delete `.github/workflows/ci.yml` so pushes do not create redundant validation action runs.
- [x] 3.2 Update `.github/workflows/publish.yml` to accept package plus tag inputs, use pnpm 11 and Node 24, checkout the tag, verify the package version, run package-local pack dry-run, and publish only that package.
- [x] 3.3 Ensure publish workflow does not run `pnpm check`, `pnpm test`, or `pnpm coverage`.
- [x] 3.4 Update `publish.sh` to dispatch the exact package publish workflow with tag input.

## 4. Changelog Summary

- [x] 4.1 Add root `CHANGELOG.md` with a generated package summary marker section.
- [x] 4.2 Add `scripts/sync-monorepo-changelog.mjs` to extract latest package changelog entries and update only the generated root section.
- [x] 4.3 Run the changelog sync script and verify the generated root summary is stable.

## 5. Package Manifest Cleanup

- [x] 5.1 Normalize publishable package `engines.node` fields to `>=24`.
- [x] 5.2 Remove or document any package-local full-validation publish hooks that conflict with workflow-owned publish and local hook validation.
- [x] 5.3 Keep raw TypeScript package publishing unchanged and avoid adding build or dist output.

## 6. Aggregate Package Evaluation

- [x] 6.1 Read pi package documentation for extension and skill path semantics across npm dependencies.
- [x] 6.2 If semantics are verified, add aggregate package sync design and implementation; otherwise document aggregate packages as a future gated phase.
- [x] 6.3 Do not add publishable aggregate packages unless path semantics are proven.

## 7. Documentation and Legacy Release Transition

- [x] 7.1 Update `README.md` with local validation, Changesets workflow, release/publish separation, tag convention, raw TypeScript publishing, and no redundant GitHub validation.
- [x] 7.2 Mark `scripts/release.mjs` as legacy in docs or safely transition references to Changesets.
- [x] 7.3 Preserve existing uncommitted intent that `.github/workflows/ci.yml` no longer runs on pull requests.

## 8. Verification

- [x] 8.1 Run `pnpm install` after dependency changes.
- [x] 8.2 Run `pnpm check`.
- [x] 8.3 Run `pnpm test`.
- [x] 8.4 Run package dry-runs for `pi-caveman`, `pi-simplify`, and `pi-station`.
- [x] 8.5 Run `openspec status --change streamline-release-publish-workflow`.
- [x] 8.6 Run `git status --short` and review the final change set.
