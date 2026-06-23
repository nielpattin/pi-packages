import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { resolveLeanMagicContextEntry } from "#src/session/lean-extensions";

describe("resolveLeanMagicContextEntry", () => {
   const path = resolveLeanMagicContextEntry();

   // When the sibling pi-magic-context package is absent (e.g. it has been
   // moved out of this monorepo), resolution returns undefined.
   it.runIf(!path)("returns undefined when the pi-magic-context package is absent", () => {
      expect(path).toBeUndefined();
   });

   it.skipIf(!path)("returns a path when pi-magic-context package exists", () => {
      expect(path).toBeDefined();
      expect(typeof path).toBe("string");
      if (path) {
         // The returned path must point to an actual file on disk.
         expect(existsSync(path)).toBe(true);
      }
   });

   it.skipIf(!path)("returns a path ending with subagent-entry.js or subagent-entry.ts", () => {
      expect(path).toBeDefined();
      if (path) {
         const matches = path.endsWith("subagent-entry.js") || path.endsWith("subagent-entry.ts");
         expect(matches).toBe(true);
      }
   });
});
