## Why

Pi loads TypeScript package extensions through jiti, so publishing built `dist/` JavaScript duplicates source and adds a build step that is no longer needed. Publishing raw TypeScript simplifies package contents, CI, release, and publish workflows.

## What Changes

- Package manifests point `main` and `pi.extensions` at TypeScript source entrypoints.
- Package `files` lists include TypeScript source directories and package docs instead of `dist`.
- The previous build-only configs, root helper, and workflow steps are removed.
- CI, release, and publish validation use check, tests, coverage, and package pack dry runs instead of builds.
- Documentation explains raw TypeScript publishing and Pi's jiti loading behavior.

## Capabilities

### New Capabilities

- `raw-typescript-publishing`: Packages SHALL publish TypeScript sources directly and expose TypeScript entrypoints for Pi extension loading.
- `quality-gates`: Repository automation SHALL validate raw TypeScript packages without a build step.
- `repository-documentation`: Documentation SHALL describe the raw TypeScript publishing model and current validation workflow.

### Modified Capabilities

## Impact

Affected files include package manifests, package build configs, root scripts, CI and publish workflows, release automation, README documentation, pnpm lockfile if manifest changes require it, and OpenSpec change artifacts. Package runtime behavior relies on Pi loading TypeScript extensions via jiti.
