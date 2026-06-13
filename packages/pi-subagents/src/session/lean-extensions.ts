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
   // __dirname equivalent for ESM: pi-subagents/src/session/
   const currentDir = fileURLToPath(new URL(".", import.meta.url));

   // Navigate: src/session/ → src/ → pi-subagents/ → packages/ → pi-magic-context/
   const magicContextDir = resolve(currentDir, "../../../pi-magic-context");

   // Compiled entry (production build via pnpm build in pi-magic-context)
   const compiledEntry = resolve(magicContextDir, "dist/src/subagent-entry.js");
   if (existsSync(compiledEntry)) return compiledEntry;

   // Source entry (dev/pre-build, when compiled dist is unavailable)
   const sourceEntry = resolve(magicContextDir, "src/subagent-entry.ts");
   if (existsSync(sourceEntry)) return sourceEntry;

   return undefined;
}
