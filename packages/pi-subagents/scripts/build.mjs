#!/usr/bin/env node
/**
 * Build pi-subagents to dist/.
 *
 * Strategy:
 *   Bundle src/index.ts → dist/index.js with esbuild for fast extension startup.
 *   Dynamic imports (#src/*) stay as dynamic imports — resolved at runtime via
 *   the package.json imports map to individual .js files in dist/src/.
 *   tsc compiles the individual .js files (needed by dynamic imports) and
 *   generates .d.ts declaration files.
 *
 *   This script:
 *     1. Bundles the main entry with esbuild (single file, resolves #src/* aliases)
 *     2. Runs tsc for individual .js files + .d.ts declarations
 *     3. Runs postbuild to add .js extensions to relative imports in dist/src/
 *     4. Updates package.json — sets main, types, exports, imports, etc.
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

// ── Step 1: Bundle main entry with esbuild ──────────────────────────────

console.log("[build] bundling src/index.ts -> dist/index.js with esbuild...");

try {
   execSync(
      `node node_modules/esbuild/bin/esbuild src/index.ts --bundle --format=esm --platform=node ` +
         `--target=node24 --outfile=dist/index.js --sourcemap ` +
         `--alias:#src=./src ` +
         `--external:@earendil-works/* --external:typebox --external:@sinclair/typebox --external:node:*`,
      { cwd: ROOT, stdio: "inherit" },
   );
} catch {
   console.error("[build] esbuild failed");
   process.exit(1);
}

// ── Step 2: Run tsc for individual .js files + .d.ts declarations ──────

console.log("[build] compiling individual files with tsc...");

try {
   execSync("tsc -p tsconfig.build.json", { cwd: ROOT, stdio: "inherit" });
} catch {
   console.error("[build] tsc failed");
   process.exit(1);
}

// ── Step 3: Postbuild — add .js extensions to relative imports ──────────

// Note: only patching relative imports (starting with ".") — #src/* imports
// remain as-is and are resolved by the package.json imports map at runtime.

console.log("[build] patching relative imports in dist/...");
execSync("node scripts/postbuild.mjs", { cwd: ROOT, stdio: "inherit" });

// ── Step 4: Update package.json for dist/ runtime ───────────────────────

pkg.main = "./dist/index.js";
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
pkg.pi.extensions = ["./dist/index.js"];
pkg.files = ["dist", ".pi/agents", "README.md", "CHANGELOG.md", "LICENSE"];

writeJson(PKG_JSON, pkg);

console.log("[build] finished — package.json updated for dist/ runtime");
console.log("[build]   main:   %s  ->  %s", origState.main, pkg.main);
console.log("[build]   types:  %s", pkg.types);
console.log("[build]   imports: #src/* -> %s", pkg.imports["#src/*"]);
console.log("[build]   pi.extensions: %s", pkg.pi.extensions.join(", "));
