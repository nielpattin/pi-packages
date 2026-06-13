---
"@nielpattin/pi-subagents": minor
---

Add TypeScript build step. A `pnpm build` command compiles `src/` to `dist/`
via `tsc -p tsconfig.build.json`. The build script updates `package.json`
fields (`main`, `types`, `exports`, `imports`, `pi.extensions`, `files`) to
point to the compiled output. Post-build step adds explicit `.js` extensions
to all extensionless relative imports in `dist/` for Node.js ESM compliance.

- `scripts/build.mjs` — orchestrates tsc, postbuild, and package.json update
- `scripts/postbuild.mjs` — adds `.js`/`/index.js` extensions to relative imports
- `tsconfig.build.json` — extends base tsconfig with `noEmit: false`, `outDir`,
  `declaration`, `sourceMap`
- `.gitignore` — ignores `dist/`, `coverage/`
