---
"@nielpattin/pi-subagents": patch
---

Bundle with esbuild for faster extension startup.

Replaces `tsc` with `esbuild` for the extension entry point (`src/index.ts`),
producing a single `dist/index.js` bundle instead of 57 individual module files.
`tsc --emitDeclarationOnly` still runs for `.d.ts` type declarations.

- `scripts/build.mjs` — runs esbuild for bundling, then tsc for types and
  individual `.js` files (needed by dynamic `import()` calls from the bundle)
- `scripts/postbuild.mjs` — unchanged, adds `.js` extensions to individual files
- `devDependencies` — adds `esbuild ^0.28.0`
- `package.json` — `main` and `pi.extensions` point to `dist/index.js` bundle

Startup improvement: reduces module-file loading time by ~20ms (692ms → 672ms).
The larger overhead (~580ms) is Pi's own startup and SDK loading, not module
resolution.
