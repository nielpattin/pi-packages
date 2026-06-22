import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { DefaultResourceLoader, getAgentDir } from "@earendil-works/pi-coding-agent";
import { resolveLeanMagicContextEntry } from "#src/session/lean-extensions";

/**
 * Integration smoke tests for the lean magic-context extension loading
 * feature.
 *
 * The lean entry (`pi-magic-context/dist/src/subagent-entry.js`) is
 * loaded via `additionalExtensionPaths` on a `DefaultResourceLoader`
 * configured with `noExtensions: true`. This simulates how subagent
 * runners pass the lean entry to child Pi processes:
 *   pi --print --no-extensions -x <subagent-entry.js> ...
 *
 * Instead of mocking, these tests use the real SDK classes to verify
 * the extension loading pipeline works end-to-end.
 */

describe("lean magic-context extension loading (integration smoke)", () => {
   const leanEntryPath = resolveLeanMagicContextEntry();
   const tempDirs: string[] = [];

   afterAll(() => {
      for (const dir of tempDirs) {
         rmSync(dir, { recursive: true, force: true });
      }
   });

   function makeTempDir(): string {
      const dir = mkdtempSync(join(tmpdir(), "pi-smoke-"));
      tempDirs.push(dir);
      return dir;
   }

   // ------------------------------------------------------------------
   // resolveLeanMagicContextEntry
   // ------------------------------------------------------------------
   describe("resolveLeanMagicContextEntry", () => {
      it("resolves a path when pi-magic-context is installed", () => {
         expect(leanEntryPath).toBeDefined();
         expect(typeof leanEntryPath).toBe("string");
      });

      it("points to an existing file on disk", () => {
         if (!leanEntryPath) return;
         expect(existsSync(leanEntryPath)).toBe(true);
      });

      it("ends with subagent-entry.js or subagent-entry.ts", () => {
         if (!leanEntryPath) return;
         const ok = leanEntryPath.endsWith("subagent-entry.js") || leanEntryPath.endsWith("subagent-entry.ts");
         expect(ok).toBe(true);
      });
   });

   // ------------------------------------------------------------------
   // DefaultResourceLoader — noExtensions: true without additional paths
   // ------------------------------------------------------------------
   describe("DefaultResourceLoader with noExtensions: true (no lean entry)", () => {
      it("loads zero extensions and reports zero errors", async () => {
         const agentDir = makeTempDir();
         const loader = new DefaultResourceLoader({
            cwd: process.cwd(),
            agentDir,
            noExtensions: true,
         });
         await loader.reload();

         const result = loader.getExtensions();
         expect(result.errors).toHaveLength(0);
         expect(result.extensions).toHaveLength(0);
      });

      it("loads zero extensions even when agentDir has real pi config", async () => {
         // Using the real getAgentDir() ensures the loader can handle
         // real-world agent dirs without picking up discovered extensions.
         const loader = new DefaultResourceLoader({
            cwd: makeTempDir(),
            agentDir: getAgentDir(),
            noExtensions: true,
         });
         await loader.reload();

         const result = loader.getExtensions();
         expect(result.errors).toHaveLength(0);
         expect(result.extensions).toHaveLength(0);
      }, 30_000);
   });

   // ------------------------------------------------------------------
   // DefaultResourceLoader — noExtensions + additionalExtensionPaths
   // ------------------------------------------------------------------
   describe("DefaultResourceLoader with lean entry via additionalExtensionPaths", () => {
      it("loads the lean entry and reports no errors", async () => {
         if (!leanEntryPath) return; // skip when pi-magic-context absent

         const agentDir = makeTempDir();
         const loader = new DefaultResourceLoader({
            cwd: process.cwd(),
            agentDir,
            noExtensions: true,
            additionalExtensionPaths: [leanEntryPath],
         });
         await loader.reload();

         const result = loader.getExtensions();
         expect(result.errors).toHaveLength(0);
         expect(result.extensions).toHaveLength(1);
      });

      it("exposes the lean entry with correct path and registered handlers", async () => {
         if (!leanEntryPath) return;

         const agentDir = makeTempDir();
         const loader = new DefaultResourceLoader({
            cwd: process.cwd(),
            agentDir,
            noExtensions: true,
            additionalExtensionPaths: [leanEntryPath],
         });
         await loader.reload();

         const { extensions, errors } = loader.getExtensions();
         expect(errors).toHaveLength(0);
         expect(extensions).toHaveLength(1);

         const ext = extensions[0];

         // Path must match the resolved lean entry
         expect(ext.path).toBe(leanEntryPath);

         // Event handlers registered at factory time
         expect(ext.handlers.has("session_start")).toBe(true);
         expect(ext.handlers.has("session_shutdown")).toBe(true);

         // Flag registered at factory time
         expect(ext.flags.has("magic-context-dreamer-actions")).toBe(true);

         // Tools are NOT registered at factory time — they are registered
         // lazily inside the session_start callback (which is not fired
         // during construction). This is by design: the lean entry delays
         // DB and tool setup until the session actually starts.
         expect(ext.tools.size).toBe(0);
      });

      it("the loaded extension has a valid sourceInfo", async () => {
         if (!leanEntryPath) return;

         const agentDir = makeTempDir();
         const loader = new DefaultResourceLoader({
            cwd: process.cwd(),
            agentDir,
            noExtensions: true,
            additionalExtensionPaths: [leanEntryPath],
         });
         await loader.reload();

         const ext = loader.getExtensions().extensions[0];
         expect(ext.sourceInfo).toBeDefined();
         expect(ext.sourceInfo.path).toBeDefined();
         expect(ext.sourceInfo.source).toBeDefined();
      });
   });
});
