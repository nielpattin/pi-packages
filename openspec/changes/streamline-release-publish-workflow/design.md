## Context

The monorepo publishes raw TypeScript pi packages from `packages/*` with independent versions. Local hooks already run the full validation gates: pre-commit runs `pnpm check` and pre-push runs `pnpm test`. GitHub workflows currently repeat check, test, and coverage during CI and publish, which conflicts with the desired model where local hooks are the validation source and GitHub publishing is a narrowly scoped packaging operation.

The existing release path is a custom `scripts/release.mjs` flow that bumps one package, updates a package changelog, commits, tags, and pushes. The desired model is closer to Changesets: explicit change files, generated version bumps and package changelog entries, independent package versions, public package access, and documented manual publish boundaries.

## Goals / Non-Goals

**Goals:**

- Adopt Changesets for independent package versioning and generated package changelog entries.
- Keep pnpm 11 and Node 24 as the only supported release tooling stack.
- Avoid full GitHub validation in CI or publish workflows by default.
- Keep publishing manual and exact: a workflow publishes a selected package from a verified tag or version.
- Require package-impacting changes to include a changeset through a local pre-push gate.
- Generate a root changelog summary from package changelogs.
- Preserve raw TypeScript package publishing and package-local pack dry-runs.
- Document the new flow and transition away from custom release behavior.

**Non-Goals:**

- Publishing to npm during this change.
- Pushing, pulling, committing, or releasing automatically during implementation.
- Adding build output or dist publishing.
- Automatically publishing on every main push.
- Implementing aggregate packages until pi package path semantics are verified against pi documentation.

## Decisions

1. Use Changesets with independent package versions.
   - Configure `.changeset/config.json` with empty `fixed` and `linked` arrays, `access: public`, `baseBranch: main`, and `@changesets/changelog-github`.
   - Add root scripts for creating changesets, versioning packages, syncing the root changelog, and publishing through Changesets.
   - Prefer Changesets default tag names, including scoped tags such as `@nielpattin/pi-station@0.6.6`, instead of preserving the legacy unscoped `pi-station@0.6.6` format.
   - Alternative considered: keep the custom release script as primary. Rejected because it does not provide a standard changeset review artifact and encourages one-off release behavior.

2. Treat local hooks as the validation source.
   - Keep pre-commit and pre-push validation local.
   - Delete GitHub CI so pushes do not create redundant validation action runs.
   - Publish workflows can install dependencies and run package-local `pack --dry-run` because packaging the exact artifact is part of publishing, not full validation.
   - Alternative considered: keep CI as a safety net. Rejected because the explicit user preference is to avoid redundant GitHub validation.

3. Make publish exact and manual.
   - Publish workflow accepts a package and a Changesets tag.
   - Checkout the tag before packaging.
   - Verify the selected package exists and `package.json` version matches the supplied tag version.
   - Run `pnpm --dir packages/<pkg> pack --dry-run`, then publish that package with `--access public --no-git-checks`.
   - Do not run `pnpm check`, `pnpm test`, or `pnpm coverage` in publish.

4. Enforce changesets locally for package-impacting changes.
   - Add `scripts/require-changeset.mjs` that diffs against a base ref, defaulting to `origin/main`.
   - If package files changed, require at least one `.changeset/*.md` file unless all changes are ignored metadata such as changelog-only edits.
   - Allow `SKIP_CHANGESET_CHECK=1` or `SKIP_HOOKS=1` for emergencies.
   - Add this gate to `.husky/pre-push` after `pnpm test`.

5. Generate a root changelog summary.
   - Add `CHANGELOG.md` with generated markers.
   - Add `scripts/sync-monorepo-changelog.mjs` to read each package `CHANGELOG.md`, extract the latest released section, and update the marked section.
   - Run this script as part of the root `version-packages` script after `changeset version`.

6. Keep aggregate packages as a designed but gated phase.
   - Document a candidate aggregate model inspired by the reference repository: aggregate package depends on constituent packages and exposes pi extension or skill paths into dependency package files.
   - Do not create publishable aggregate packages until pi package documentation confirms cross-package path semantics work after npm installation.
   - Record this as a task to verify and then decide.

7. Keep the legacy release script only if clearly marked or made safe.
   - Prefer documentation and scripts that route releases through Changesets.
   - If `scripts/release.mjs` remains, mark it as legacy and avoid surprise push behavior in docs.
   - Do not remove it unless all docs and workflows no longer refer to it and the replacement is verified.

## Risks / Trade-offs

- GitHub no longer provides full validation on pushed code. Mitigation: document that local hooks are required and keep hooks as the validation source.
- Changesets tag format differs for scoped packages. Mitigation: document the default scoped tag convention and make publish workflow parse/verify it.
- Package changelog format may shift from current Keep a Changelog style. Mitigation: accept Changesets output for new entries and use root summary generation rather than manually duplicating history.
- Changeset-required gate can block non-release changes. Mitigation: ignore changelog-only/docs-only package files where appropriate and allow explicit skip environment variables.
- Aggregate package paths may not work across installed dependency boundaries. Mitigation: keep aggregates as future implementation until semantics are proven.
