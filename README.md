# pi-packages

[![CI](https://github.com/nielpattin/pi-packages/actions/workflows/ci.yml/badge.svg)](https://github.com/nielpattin/pi-packages/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

Independent [Pi coding agent](https://github.com/earendil-works/pi-coding-agent) extensions focused on developer workflow. This repo exists to keep small, focused Pi packages in one workspace while preserving independent package versioning, release notes, and npm publishing.

Packages publish raw TypeScript source. Pi loads `.ts` extension entrypoints through jiti, so this repo does not build packages to `dist/` before publishing.

## Packages

| Package                               | Role                                                                             | Install                            | npm                                                          | Version |
| ------------------------------------- | -------------------------------------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------ | ------- |
| [pi-caveman](./packages/pi-caveman)   | Terse communication modes and compact review, commit, and memory-writing skills. | `pnpm add @nielpattin/pi-caveman`  | [npm](https://www.npmjs.com/package/@nielpattin/pi-caveman)  | 1.0.4   |
| [pi-simplify](./packages/pi-simplify) | Reviews recent code changes for clarity, consistency, and maintainability.       | `pnpm add @nielpattin/pi-simplify` | [npm](https://www.npmjs.com/package/@nielpattin/pi-simplify) | 0.2.6   |
| [pi-station](./packages/pi-station)   | Station bar status extension for the Pi coding agent TUI.                        | `pnpm add @nielpattin/pi-station`  | [npm](https://www.npmjs.com/package/@nielpattin/pi-station)  | 0.6.4   |

## Prerequisites

- Node.js 24
- pnpm 11
- Pi coding agent for running extensions

## Setup

```bash
pnpm install
```

## Daily Development

```bash
pnpm fmt       # format with oxfmt
pnpm lint      # auto-fix lint issues with oxlint
pnpm test      # run Vitest tests
pnpm coverage  # run Vitest coverage with enforced thresholds
pnpm check     # lint, format check, and TypeScript typecheck
```

Git hooks run automatically through Husky:

- pre-commit: `pnpm check`
- pre-push: `pnpm test`

## Package Validation

Use package dry runs to verify npm tarball contents before publishing:

```bash
pnpm --dir packages/pi-caveman pack --dry-run
pnpm --dir packages/pi-simplify pack --dry-run
pnpm --dir packages/pi-station pack --dry-run
```

The dry-run output should include TypeScript source files and package docs, and should not include `dist/`.

## Add a New Package

1. Create `packages/pi-foo/` with `package.json` and `tsconfig.json`.
2. The root workspace already includes `packages/*` in `pnpm-workspace.yaml` and root `package.json`.
3. Create `CHANGELOG.md` with a `## [Unreleased]` header.
4. Ensure the package has:
   - `"type": "module"`
   - `main` pointing to the TypeScript source entrypoint
   - `pi.extensions` pointing to the TypeScript source entrypoint
   - a `test` script when it has tests
   - source files and `CHANGELOG.md` in `files[]`
   - repository metadata with `directory: "packages/pi-foo"`

## Release

```bash
# 1. Draft changelog entries in packages/<pkg>/CHANGELOG.md under [Unreleased]
# 2. Commit any pending work, because the release script requires a clean tree
node scripts/release.mjs pi-station patch
```

The release script keeps packages independently versioned and automates:

1. Verify the working tree is clean.
2. Validate `packages/<pkg>/CHANGELOG.md` has `## [Unreleased]` and warn if that section has no bullet entries.
3. Run `pnpm check`, `pnpm test`, `pnpm coverage`, and `pnpm --dir packages/<pkg> pack --dry-run`.
4. Bump the target package version with `pnpm version`.
5. Promote `[Unreleased]` to `[version] - date` in that package changelog.
6. Commit and tag `v<pkg>@<version>`.
7. Push `main` and the tag.
8. Recreate `[Unreleased]`, commit, and push the changelog reset.

## Publish

```bash
bash publish.sh            # all packages, one workflow dispatch per package
bash publish.sh pi-station # one package
```

`publish.sh` triggers `.github/workflows/publish.yml`. The workflow checks out the repo, installs with `pnpm install --frozen-lockfile`, runs check, test, coverage, verifies the selected package with `pnpm --dir packages/<pkg> pack --dry-run`, and publishes from `packages/<pkg>`.

## CI

`.github/workflows/ci.yml` runs on Node 24 with pnpm 11:

1. `pnpm install --frozen-lockfile`
2. `pnpm check`
3. `pnpm test`
4. `pnpm coverage`

## Project Structure

```text
pi-packages/
├── .github/workflows/
│   ├── ci.yml                    # Node 24 verification
│   └── publish.yml               # npm publish via GitHub Actions
├── .husky/
│   ├── pre-commit                # pnpm check
│   └── pre-push                  # pnpm test
├── .nvmrc                        # Node 24
├── openspec/                     # change proposals and specs
├── packages/
│   ├── pi-caveman                # independent npm package
│   ├── pi-simplify               # independent npm package
│   └── pi-station                # independent npm package
├── scripts/
│   └── release.mjs               # per-package release orchestrator
├── publish.sh                    # gh workflow dispatch helper
├── oxlint.config.ts              # oxlint config
├── oxfmt.config.ts               # oxfmt config
├── package.json                  # workspaces, shared devDeps, scripts
├── pnpm-workspace.yaml           # packages/* workspace definition
├── tsconfig.json                 # shared TS config
└── vitest.config.ts              # tests and coverage
```

## Tooling

| Tool       | Config                | Purpose                        |
| ---------- | --------------------- | ------------------------------ |
| oxlint     | `oxlint.config.ts`    | Linting                        |
| oxfmt      | `oxfmt.config.ts`     | Formatting                     |
| Vitest     | `vitest.config.ts`    | Testing and coverage           |
| TypeScript | `tsconfig.json`       | Type checking                  |
| Husky      | `.husky/*`            | Git hooks                      |
| pnpm       | `pnpm-workspace.yaml` | Package manager and workspaces |

## License

MIT
