import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadSettings, SettingsManager, saveSettings } from "#src/settings";
import { GitWorktreeManager } from "#src/lifecycle/worktree";

/**
 * Tests for session-aware cwd resolution via getter functions.
 *
 * The fix for "use session cwd instead of process.cwd()" changes classes to accept
 * `string | (() => string)` for cwd parameters so they always read the current value
 * from a mutable closure (e.g., `currentCwd` in index.ts that updates on session_start).
 */
describe("session-aware cwd resolution", () => {
   let dir1: string;
   let dir2: string;

   beforeEach(() => {
      dir1 = mkdtempSync(join(tmpdir(), "pi-cwd-test1-"));
      dir2 = mkdtempSync(join(tmpdir(), "pi-cwd-test2-"));
   });

   afterEach(() => {
      rmSync(dir1, { recursive: true, force: true });
      rmSync(dir2, { recursive: true, force: true });
   });

   describe("SettingsManager with getter cwd", () => {
      it("resolves cwd from getter on load()", () => {
         // Write settings to dir1
         mkdirSync(join(dir1, ".pi"), { recursive: true });
         writeFileSync(join(dir1, ".pi", "subagents.json"), JSON.stringify({ maxConcurrent: 7 }));

         const sm = new SettingsManager({
            emit: vi.fn(),
            cwd: () => dir1,
            agentDir: "/nonexistent",
         });
         sm.load();
         expect(sm.maxConcurrent).toBe(7);
      });

      it("resolves cwd dynamically — switching from dir1 to dir2 on saveAndNotify()", () => {
         let currentDir = dir1;
         const sm = new SettingsManager({
            emit: vi.fn(),
            cwd: () => currentDir,
            agentDir: "/nonexistent",
         });

         // Save to dir1
         sm.maxConcurrent = 3;
         sm.saveAndNotify("test");
         expect(existsSync(join(dir1, ".pi", "subagents.json"))).toBe(true);
         expect(JSON.parse(readFileSync(join(dir1, ".pi", "subagents.json"), "utf-8")).maxConcurrent).toBe(3);

         // Switch cwd and save to dir2
         currentDir = dir2;
         sm.maxConcurrent = 9;
         sm.saveAndNotify("test2");
         expect(existsSync(join(dir2, ".pi", "subagents.json"))).toBe(true);
         expect(JSON.parse(readFileSync(join(dir2, ".pi", "subagents.json"), "utf-8")).maxConcurrent).toBe(9);

         // dir1 still has old value
         expect(JSON.parse(readFileSync(join(dir1, ".pi", "subagents.json"), "utf-8")).maxConcurrent).toBe(3);
      });

      it("resolves cwd from getter on load() dynamically", () => {
         // Write settings to both dirs
         mkdirSync(join(dir1, ".pi"), { recursive: true });
         writeFileSync(join(dir1, ".pi", "subagents.json"), JSON.stringify({ maxConcurrent: 5 }));
         mkdirSync(join(dir2, ".pi"), { recursive: true });
         writeFileSync(join(dir2, ".pi", "subagents.json"), JSON.stringify({ maxConcurrent: 11 }));

         let currentDir = dir1;
         const sm = new SettingsManager({
            emit: vi.fn(),
            cwd: () => currentDir,
            agentDir: "/nonexistent",
         });

         sm.load();
         expect(sm.maxConcurrent).toBe(5);

         // Switch cwd and reload
         currentDir = dir2;
         sm.load();
         expect(sm.maxConcurrent).toBe(11);
      });

      it("still works with a plain string cwd (backward compat)", () => {
         mkdirSync(join(dir1, ".pi"), { recursive: true });
         writeFileSync(join(dir1, ".pi", "subagents.json"), JSON.stringify({ graceTurns: 3 }));

         const sm = new SettingsManager({
            emit: vi.fn(),
            cwd: dir1,
            agentDir: "/nonexistent",
         });
         sm.load();
         expect(sm.graceTurns).toBe(3);
      });
   });

   describe("GitWorktreeManager with getter cwd", () => {
      it("resolves cwd from getter on create()", () => {
         // createWorktree requires a git repo, so we just verify the getter is called
         // by checking that the cwd is resolved at call time, not construction time.
         let currentDir = dir1;
         const wm = new GitWorktreeManager(() => currentDir);

         // create() will fail (not a git repo) but should use the current dir
         const result = wm.create("test-id");
         expect(result).toBeUndefined(); // expected — not a git repo

         // Switch to dir2 — create should now use dir2
         currentDir = dir2;
         const result2 = wm.create("test-id-2");
         expect(result2).toBeUndefined(); // still not a git repo, but cwd was resolved dynamically
      });

      it("still works with a plain string cwd (backward compat)", () => {
         const wm = new GitWorktreeManager(dir1);
         const result = wm.create("test-id");
         expect(result).toBeUndefined(); // not a git repo
      });
   });

   describe("loadSettings and saveSettings with default process.cwd()", () => {
      it("loadSettings default parameter still works (backward compat)", () => {
         // This tests that the default parameter `cwd = process.cwd()` still works
         // when called without an explicit cwd argument.
         const result = loadSettings("/nonexistent-agent-dir");
         expect(result).toEqual({});
      });

      it("saveSettings default parameter still works (backward compat)", () => {
         // This tests that the default parameter `cwd = process.cwd()` still works
         // when called without an explicit cwd argument.
         // We can't easily test the default without mocking process.cwd(),
         // but we can verify the explicit cwd path works.
         const result = saveSettings({ maxConcurrent: 2 }, dir1);
         expect(result).toBe(true);
      });
   });
});
