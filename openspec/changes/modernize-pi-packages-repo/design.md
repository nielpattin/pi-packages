## Context

The repo hosts independent Pi extension packages. Existing modernization work has introduced pnpm, oxlint, oxfmt, Vitest, and release scripts, but package directories still live at the repository root. The user wants an rpiv-style scalable workspace layout, Node 24-only automation, enforceable coverage, stronger per-package releases, accurate docs, and aligned hooks.

## Goals / Non-Goals

**Goals:**

- Move all package projects to `packages/<name>` and update all repository automation to that structure.
- Keep each package independently versioned and released.
- Add CI for Node 24 with pnpm install, check, tests, and coverage.
- Make coverage thresholds realistic and enforceable under Vitest v4.
- Document the repository purpose, package map, commands, hooks, and release flow.
- Preserve existing staged work and avoid committing.

**Non-Goals:**

- No lockstep release model.
- No raw TypeScript publish model in this pass.
- No package API redesign.
- No remote publish, git commit, or git push.

## Decisions

1. Use `packages/*` as the only workspace glob.
   - Rationale: It scales beyond three packages and matches the requested rpiv-style layout.
   - Alternative considered: keep root package folders and only fix docs. Rejected because it does not address the structural goal.

2. Keep package output decisions isolated from the workspace layout change.
   - Rationale: Existing package metadata and publish workflows rely on built JavaScript. Raw TypeScript publishing needs a separate compatibility spike against Pi package loading behavior.
   - Alternative considered: publish source TypeScript immediately. Rejected as out of scope and higher risk.

3. Keep per-package release scripts with a full root gate before versioning.
   - Rationale: Packages are independent, but releases should not proceed from a broken repo.
   - Alternative considered: lockstep release. Rejected by user requirement.

4. Use realistic global coverage thresholds below the current measured coverage.
   - Rationale: Thresholds must fail when coverage regresses while remaining passable today.
   - Alternative considered: high aspirational thresholds. Rejected because they would block modernization before coverage work is complete.

## Risks / Trade-offs

- Path migration can miss stale references. Mitigation: run targeted searches for old root package paths, stale Node version docs, legacy config names, and disallowed package-manager commands.
- Package move can disturb staged work. Mitigation: use `git mv` so existing tracked changes are preserved as renames where possible.
- Coverage behavior can differ between Vitest versions. Mitigation: verify `pnpm coverage` exits successfully after threshold changes.
