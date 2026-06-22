import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Resolve from this test file's location so the test works regardless of the
// process cwd (e.g. when run from the workspace root by `vitest run`).
const root = fileURLToPath(new URL("..", import.meta.url));

function readProjectFile(path: string): string {
   return readFileSync(join(root, path), "utf8");
}

describe("package metadata", () => {
   it("uses latest Pi package peer conventions for typebox", () => {
      const pkg = JSON.parse(readProjectFile("package.json")) as {
         peerDependencies?: Record<string, string>;
      };

      expect(pkg.peerDependencies?.typebox).toBe("*");
      expect(pkg.peerDependencies).not.toHaveProperty("@sinclair/typebox");
   });

   it("imports tool schemas from the current typebox package", () => {
      const sourcePaths = ["src/tools/agent-tool.ts", "src/tools/get-result-tool.ts", "src/tools/steer-tool.ts"];

      for (const sourcePath of sourcePaths) {
         const source = readProjectFile(sourcePath);
         expect(source).toContain('from "typebox"');
         expect(source).not.toContain('from "@sinclair/typebox"');
      }
   });
});
