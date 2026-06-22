#!/usr/bin/env node
/**
 * Post-build: add unambiguous .js or /index.js extensions to all extensionless
 * relative imports in the compiled dist/ output.
 *
 * jiti v2 tries native Node.js ESM first. Extensionless relative imports
 * (e.g. `from "./foo"`) are not valid ESM, so Node rejects every .js file,
 * jiti falls back to its transpile pipeline, and we lose the compile-to-JS
 * benefit.  Adding explicit extensions lets native ESM succeed.
 *
 * This script resolves each relative import against the importing file's
 * directory, checks whether `{specifier}.js` or `{specifier}/index.js` exists
 * in the dist/ tree, and patches accordingly.  Imports that already have a
 * known extension (.js / .mjs / .cjs / .json / .node) are left alone.
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = resolve(ROOT, "dist");

const KNOWN_EXT_RE = /\.(js|mjs|cjs|json|node)$/;

/**
 * Resolve the actual file in dist/ that a relative import refers to.
 * Returns the path that exists, or undefined if neither guess matches.
 */
function resolveRelative(importerDir, specifier) {
   const base = resolve(importerDir, specifier);
   // Check {specifier}.js
   const asFile = base + ".js";
   if (existsSync(asFile)) return specifier + ".js";
   // Check {specifier}/index.js
   const asIndex = resolve(base, "index.js");
   if (existsSync(asIndex)) return specifier + "/index.js";
   // Check {specifier}/index.mjs
   const asIndexMjs = resolve(base, "index.mjs");
   if (existsSync(asIndexMjs)) return specifier + "/index.mjs";
   return undefined; // leave as-is, will fall back to jiti
}

function* walk(dir) {
   const entries = readdirSync(dir, { withFileTypes: true });
   for (const e of entries) {
      if (e.name.startsWith(".")) continue;
      const fp = resolve(dir, e.name);
      if (e.isDirectory()) yield* walk(fp);
      else if (e.name.endsWith(".js")) yield fp;
   }
}

// Regex: match extensionless relative import/re-export specifiers.
// Groups: entire match, the prefix + "", the specifier, the closing "
const RE =
   /(from\s+")(\.[^"]+)(")|(export\s+\*\s+from\s+")(\.[^"]+)(")|(export\s+\{[^}]*\}\s*from\s+")(\.[^"]+)(")|(import\s*\(\s*")(\.[^"]+)("\s*\))/g;

let patched = 0;
let fileCount = 0;

for (const fp of walk(DIST)) {
   fileCount++;
   const importerDir = dirname(fp);
   let content = readFileSync(fp, "utf8");
   let changed = false;

   content = content.replace(RE, (match, ...groups) => {
      // Determine the specifier and the surrounding quote context
      let prefix, specifier, suffix;
      if (groups[0] !== undefined) {
         // from "..."
         prefix = groups[0];
         specifier = groups[1];
         suffix = groups[2];
      } else if (groups[3] !== undefined) {
         // export * from "..."
         prefix = groups[3];
         specifier = groups[4];
         suffix = groups[5];
      } else if (groups[6] !== undefined) {
         // export { ... } from "..."
         prefix = groups[6];
         specifier = groups[7];
         suffix = groups[8];
      } else if (groups[9] !== undefined) {
         // import("...")
         prefix = groups[9];
         specifier = groups[10];
         suffix = groups[11];
      } else {
         return match;
      }

      if (KNOWN_EXT_RE.test(specifier)) return match;
      const resolved = resolveRelative(importerDir, specifier);
      if (resolved && resolved !== specifier) {
         changed = true;
         patched++;
         return `${prefix}${resolved}${suffix}`;
      }
      return match;
   });

   if (changed) writeFileSync(fp, content, "utf8");
}

console.log(`[postbuild] patched ${patched} imports across ${fileCount} files`);
