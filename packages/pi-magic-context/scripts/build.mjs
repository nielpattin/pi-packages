#!/usr/bin/env node
/**
 * Build pi-magic-context to dist/.
 *
 * Strategy:
 *   The package.json `imports` map routes `#core/*` to TypeScript source for
 *   type-checking and development.  At runtime we need it to point to compiled
 *   JS so jiti loads `.js` files without transpilation.
 *
 *   This script:
 *     1. Temporarily rewrites `imports` to `.ts`, runs tsc (which needs the
 *        `.ts` sources), then rewrites `imports` to `.js` so Pi/jiti load the
 *        compiled output.
 *     2. Generates `.d.ts` declaration files alongside the `.js` output so
 *        `pnpm typecheck` still works (tsc follows `.d.ts` through the new
 *        `imports` map).
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PKG_JSON = resolve(ROOT, "package.json");

// ── Helpers ──────────────────────────────────────────────────────────────

function readJson(path) {
   return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, obj) {
   writeFileSync(path, JSON.stringify(obj, null, 3) + "\n", "utf8");
}

// ── Step 1: Patch imports -> .ts (for tsc compilation) ──────────────────

const pkg = readJson(PKG_JSON);
const origImports = JSON.parse(JSON.stringify(pkg.imports || {}));

if (pkg.imports?.["#core/*"]) {
   pkg.imports["#core/*"] = "./core/*.ts";
   writeJson(PKG_JSON, pkg);
   console.log("[build] patched imports to .ts for compilation");
}

// ── Step 2: Run tsc ─────────────────────────────────────────────────────

try {
   execSync("tsc -p tsconfig.build.json", { cwd: ROOT, stdio: "inherit" });
} catch {
   pkg.imports = origImports;
   writeJson(PKG_JSON, pkg);
   console.error("[build] tsc failed - imports restored to original");
   process.exit(1);
}

// ── Step 3: Restore imports -> .js (for runtime) ────────────────────────

pkg.imports = origImports;
if (pkg.imports?.["#core/*"]?.endsWith(".ts")) {
   pkg.imports["#core/*"] = "./dist/core/*.js";
}
writeJson(PKG_JSON, pkg);
console.log("[build] restored imports to .js for runtime");

// ── Step 4: Add .js extensions to all relative imports ─────────────────

console.log("[build] patching relative imports in dist/...");
execSync("node scripts/postbuild.mjs", { cwd: ROOT, stdio: "inherit" });
