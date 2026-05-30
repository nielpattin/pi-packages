## 1. Package Manifests

- [x] 1.1 Update `pi-caveman` manifest to point at `index.ts`, publish source files, and remove dist build metadata.
- [x] 1.2 Update `pi-simplify` manifest to point at `src/index.ts`, publish source files, and remove dist build metadata.
- [x] 1.3 Update `pi-station` manifest to point at `index.ts`, publish source files, and remove dist build metadata.

## 2. Build Removal

- [x] 2.1 Remove package build-only TypeScript config files.
- [x] 2.2 Remove the root build helper script.
- [x] 2.3 Remove stale dist/build assumptions from gitignore and docs where needed.

## 3. Automation

- [x] 3.1 Remove CI build step and keep check, test, and coverage.
- [x] 3.2 Update release automation to replace build with target package pack dry-run.
- [x] 3.3 Update publish workflow to validate with check, test, coverage, pack dry-run, and publish from `packages/<pkg>` with `--no-git-checks`.

## 4. Documentation

- [x] 4.1 Update README to describe raw TypeScript publishing through Pi jiti.
- [x] 4.2 Remove stale build-output and prepublish guard documentation.
- [x] 4.3 Update CI, release, and publish documentation for no-build validation.

## 5. Verification

- [x] 5.1 Run `pnpm install --frozen-lockfile`.
- [x] 5.2 Run `pnpm check`, `pnpm test`, and `pnpm coverage`.
- [x] 5.3 Run `pnpm --dir packages/<pkg> pack --dry-run` for each package.
- [x] 5.4 Inspect dry-run output to confirm TS source files are included and `dist` is excluded.
- [x] 5.5 Run stale-reference checks for previous dist entrypoints, build-only configs, build scripts, disallowed package-manager commands, and stale Node version docs.
