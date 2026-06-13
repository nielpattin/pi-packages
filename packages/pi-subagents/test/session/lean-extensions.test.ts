import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { resolveLeanMagicContextEntry } from "#src/session/lean-extensions";

describe("resolveLeanMagicContextEntry", () => {
   it("returns a path when pi-magic-context package exists", () => {
      const path = resolveLeanMagicContextEntry();
      expect(path).toBeDefined();
      expect(typeof path).toBe("string");
      if (path) {
         // The returned path must point to an actual file on disk.
         expect(existsSync(path)).toBe(true);
      }
   });

   it("returns a path ending with subagent-entry.js or subagent-entry.ts", () => {
      const path = resolveLeanMagicContextEntry();
      expect(path).toBeDefined();
      if (path) {
         const matches = path.endsWith("subagent-entry.js") || path.endsWith("subagent-entry.ts");
         expect(matches).toBe(true);
      }
   });
});
