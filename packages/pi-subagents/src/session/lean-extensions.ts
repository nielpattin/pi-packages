import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Resolve the lean magic-context subagent entry point.
 *
 * Looks for the compiled `dist/src/subagent-entry.js` (production build)
 * or the source `src/subagent-entry.ts` (dev/pre-build) in the sibling
 * pi-magic-context workspace package.
 *
 * The lean entry registers only the tool surface (ctx_search, ctx_memory,
 * ctx_note, ctx_expand) — no historian, no dreamer, no prompt injection.
 *
 * Returns the absolute path if found, undefined otherwise.
 */
export function resolveLeanMagicContextEntry(): string | undefined {
   // __dirname equivalent for ESM. May resolve to either the source
   // (src/session/) or the compiled output (dist/src/session/) depending on
   // how the module is loaded, so walk up the tree to locate the sibling
   // pi-magic-context workspace package rather than hardcoding a depth.
   let currentDir = fileURLToPath(new URL(".", import.meta.url));

   let magicContextDir: string | undefined;
   for (let i = 0; i < 8; i++) {
      const candidate = resolve(currentDir, "pi-magic-context");
      if (existsSync(candidate)) {
         magicContextDir = candidate;
         break;
      }
      const parent = resolve(currentDir, "..");
      if (parent === currentDir) break;
      currentDir = parent;
   }

   if (!magicContextDir) return undefined;

   // Compiled entry (production build via pnpm build in pi-magic-context)
   const compiledEntry = resolve(magicContextDir, "dist/src/subagent-entry.js");
   if (existsSync(compiledEntry)) return compiledEntry;

   // Source entry (dev/pre-build, when compiled dist is unavailable)
   const sourceEntry = resolve(magicContextDir, "src/subagent-entry.ts");
   if (existsSync(sourceEntry)) return sourceEntry;

   return undefined;
}
