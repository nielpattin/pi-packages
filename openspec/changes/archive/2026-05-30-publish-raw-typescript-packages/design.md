## Context

The repository currently uses a `dist/` build model created by per-package TypeScript build configs and build scripts. The user confirmed Pi loads `.ts` extensions via jiti, so packages can publish source TypeScript directly.

## Goals / Non-Goals

**Goals:**

- Remove package build outputs and build-only configuration.
- Publish raw TypeScript entrypoints and source directories.
- Keep Node 24 and pnpm-only validation.
- Replace build gates with pack dry-run checks that verify package contents.
- Stage intended changes without committing.

**Non-Goals:**

- No runtime API changes.
- No package version bump.
- No lockstep release change.
- No git commit or publish.

## Decisions

1. Point package `main` and `pi.extensions` to source `.ts` entrypoints.
   - Rationale: Pi loads TypeScript extensions through jiti.
   - Alternative considered: keep `dist` for npm consumers. Rejected because the user requested raw TypeScript publishing.

2. Remove the previous package build scripts and build-only TypeScript configs.
   - Rationale: Keeping build config after removing dist publishing creates stale validation paths.
   - Alternative considered: keep build as an optional local command. Rejected because the goal is no build model.

3. Use pack dry runs as the package artifact gate.
   - Rationale: `pnpm --dir packages/<pkg> pack --dry-run` proves publish contents include source and exclude dist.
   - Alternative considered: rely only on tests and coverage. Rejected because those do not verify tarball contents.

## Risks / Trade-offs

- Consumers that expect JavaScript entrypoints may need Pi or another loader capable of TypeScript. Mitigation: document that packages publish raw TypeScript for Pi jiti loading.
- `files` patterns can omit needed source files. Mitigation: inspect each package pack dry-run output.
