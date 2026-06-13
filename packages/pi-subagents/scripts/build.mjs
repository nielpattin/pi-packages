#!/usr/bin/env node
/**
 * Build pi-subagents to dist/.
 *
 * Strategy:
 *   The package.json `imports` map routes `#src/*` to TypeScript source for
 *   development and test resolution (vitest alias, tsc paths).  At runtime
 *   (when Pi loads the extension via jiti) we need it to point to compiled
 *   `.js` files so jiti loads them without transpilation.
 *
 *   This script:
 *     1. Runs `tsc -p tsconfig.build.json` — the build tsconfig has `paths`
 *        that resolve `#src/*` to `./src/*`, so tsc finds the source files.
 *     2. Runs `scripts/postbuild.mjs` to add explicit `.js` extensions to
 *        all extensionless relative imports in the compiled output (required
 *        for Node.js ESM).
 *     3. Updates `package.json` — sets `main`, `types`, `exports`, `imports`,
 *        `files`, and `pi.extensions` to point to the `dist/` output.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PKG_JSON = resolve(ROOT, "package.json");

function readJson(path) {
   return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, obj) {
   writeFileSync(path, JSON.stringify(obj, null, 3) + "\n", "utf8");
}

const pkg = readJson(PKG_JSON);
const origState = {
   main: pkg.main,
   types: pkg.types,
   exports: pkg.exports,
   imports: JSON.parse(JSON.stringify(pkg.imports || {})),
   extensions: pkg.pi?.extensions ? [...pkg.pi.extensions] : undefined,
   files: pkg.files ? [...pkg.files] : undefined,
};

// ── Step 1: Run tsc ─────────────────────────────────────────────────────

try {
   execSync("tsc -p tsconfig.build.json", { cwd: ROOT, stdio: "inherit" });
} catch {
   console.error("[build] tsc failed");
   process.exit(1);
}

// ── Step 2: Postbuild — add .js extensions to relative imports ──────────

console.log("[build] patching relative imports in dist/...");
execSync("node scripts/postbuild.mjs", { cwd: ROOT, stdio: "inherit" });

// ── Step 3: Update package.json for dist/ runtime ───────────────────────

pkg.main = "./dist/src/index.js";
pkg.types = "./dist/src/index.d.ts";
pkg.exports = {
   ".": {
      types: "./dist/src/service/service.d.ts",
      default: "./dist/src/service/service.js",
   },
   "./package.json": "./package.json",
};
pkg.imports = {
   "#src/*": "./dist/src/*.js",
};
pkg.pi = pkg.pi || {};
pkg.pi.extensions = ["./dist/src/index.js"];
pkg.files = ["dist", ".pi/agents", "README.md", "CHANGELOG.md", "LICENSE"];

writeJson(PKG_JSON, pkg);

console.log("[build] finished — package.json updated for dist/ runtime");
console.log("[build]   main:   %s  →  %s", origState.main, pkg.main);
console.log("[build]   types:  %s", pkg.types);
console.log("[build]   imports: #src/* → %s", pkg.imports["#src/*"]);
console.log("[build]   pi.extensions: %s", pkg.pi.extensions.join(", "));
