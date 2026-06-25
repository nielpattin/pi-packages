import { describe, it, expect } from "vitest";
import { extractAtToken, parseReferenceToken, fuzzyMatch, expandReferenceTokens } from "../autocomplete.js";
import type { ReferenceInfo } from "../types.js";
import { existsSync, mkdirSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

function makeRef(name: string, path: string): ReferenceInfo {
   return {
      name,
      path,
      source: { type: "local", path },
   };
}

describe("extractAtToken", () => {
   it("extracts @ token from start of line", () => {
      expect(extractAtToken("@opencode")).toBe("@opencode");
   });

   it("extracts @ token after space", () => {
      expect(extractAtToken("read @opencode")).toBe("@opencode");
   });

   it("extracts @ token with path", () => {
      expect(extractAtToken("@opencode/packages/core")).toBe("@opencode/packages/core");
   });

   it("extracts quoted @ token", () => {
      expect(extractAtToken('@"opencode')).toBe('@"opencode');
   });

   it("returns null for non-@ text", () => {
      expect(extractAtToken("hello world")).toBeNull();
   });

   it("returns null for empty text", () => {
      expect(extractAtToken("")).toBeNull();
   });

   it("extracts @ token after equals sign", () => {
      expect(extractAtToken("path=@opencode")).toBe("@opencode");
   });
});

describe("parseReferenceToken", () => {
   const references = [makeRef("opencode", "/cache/opencode"), makeRef("docs", "/project/docs")];

   it("parses @alias without path", () => {
      const result = parseReferenceToken("@opencode", references);
      expect(result?.alias).toBe("opencode");
      expect(result?.refPath).toBe("/cache/opencode");
      expect(result?.remainder).toBe("");
   });

   it("parses @alias/path", () => {
      const result = parseReferenceToken("@opencode/packages/core", references);
      expect(result?.alias).toBe("opencode");
      expect(result?.refPath).toBe("/cache/opencode");
      expect(result?.remainder).toBe("packages/core");
   });

   it("parses @alias/ with trailing slash", () => {
      const result = parseReferenceToken("@opencode/", references);
      expect(result?.alias).toBe("opencode");
      expect(result?.remainder).toBe("");
   });

   it("returns null for unknown alias", () => {
      expect(parseReferenceToken("@unknown/path", references)).toBeNull();
   });

   it("parses quoted @ token", () => {
      const result = parseReferenceToken('@"opencode/src', references);
      expect(result?.alias).toBe("opencode");
      expect(result?.remainder).toBe("src");
   });
});

describe("fuzzyMatch", () => {
   it("matches exact string", () => {
      expect(fuzzyMatch("opencode", "opencode")).toBe(true);
   });

   it("matches subsequence", () => {
      expect(fuzzyMatch("oc", "opencode")).toBe(true);
      expect(fuzzyMatch("ocd", "opencode")).toBe(true);
   });

   it("matches case-insensitively", () => {
      expect(fuzzyMatch("OC", "opencode")).toBe(true);
      expect(fuzzyMatch("oc", "OPENCODE")).toBe(true);
   });

   it("does not match non-subsequence", () => {
      expect(fuzzyMatch("xyz", "opencode")).toBe(false);
   });

   it("matches empty query", () => {
      expect(fuzzyMatch("", "opencode")).toBe(true);
   });
});

describe("expandReferenceTokens", () => {
   const tmpDir = join(tmpdir(), `pi-reference-test-${Date.now()}`);
   const references = [makeRef("testref", tmpDir)];

   // Setup temp directory with test files
   mkdirSync(join(tmpDir, "src"), { recursive: true });
   writeFileSync(join(tmpDir, "hello.txt"), "Hello World!");
   writeFileSync(join(tmpDir, "src", "index.ts"), "export default 42;");

   // Teardown after tests
   afterAll(() => {
      rmSync(tmpDir, { recursive: true, force: true });
   });

   it("expands @alias/path to file content", () => {
      const result = expandReferenceTokens("Check @testref/hello.txt", references);
      expect(result).toContain('<file path="@testref/hello.txt">');
      expect(result).toContain("Hello World!");
   });

   it("expands @alias/nested/path", () => {
      const result = expandReferenceTokens("See @testref/src/index.ts", references);
      expect(result).toContain('<file path="@testref/src/index.ts">');
      expect(result).toContain("export default 42;");
   });

   it("lists directory for @alias/dir/", () => {
      const result = expandReferenceTokens("Browse @testref/src/", references);
      expect(result).toContain("directory listing:");
      expect(result).toContain("index.ts");
   });

   it("returns original text for unknown alias", () => {
      const result = expandReferenceTokens("Check @unknown/path.txt", references);
      expect(result).toBe("Check @unknown/path.txt");
   });

   it("returns original text when no @ tokens", () => {
      const result = expandReferenceTokens("Just regular text", references);
      expect(result).toBe("Just regular text");
   });

   it("handles missing file gracefully", () => {
      const result = expandReferenceTokens("Read @testref/nonexistent.txt", references);
      expect(result).toContain("[File not found or not readable]");
   });

   it("handles empty references array", () => {
      const result = expandReferenceTokens("Check @testref/hello.txt", []);
      expect(result).toBe("Check @testref/hello.txt");
   });

   it("expands multiple tokens in one message", () => {
      const result = expandReferenceTokens("Read @testref/hello.txt and @testref/src/index.ts", references);
      expect(result).toContain("Hello World!");
      expect(result).toContain("export default 42;");
   });
});
