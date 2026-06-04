import { describe, expect, it, vi } from "vitest";
import type { WorktreeCleanupResult, WorktreeInfo, WorktreeManager } from "#src/lifecycle/worktree";
import { WorktreeIsolation } from "#src/lifecycle/worktree-isolation";

const WT_INFO: WorktreeInfo = { path: "/tmp/wt", branch: "pi-agent-1" };

function makeWorktrees(overrides?: {
   createResult?: WorktreeInfo | undefined;
   cleanupResult?: WorktreeCleanupResult;
}): WorktreeManager {
   const createReturn = overrides !== undefined && "createResult" in overrides ? overrides.createResult : WT_INFO;
   const cleanupReturn: WorktreeCleanupResult = overrides?.cleanupResult ?? { hasChanges: false };
   return {
      create: vi.fn(() => createReturn),
      cleanup: vi.fn(() => cleanupReturn),
      prune: vi.fn(),
   };
}

describe("WorktreeIsolation — setup", () => {
   it("creates the worktree via the manager and exposes the path", () => {
      const worktrees = makeWorktrees();
      const wt = new WorktreeIsolation(worktrees, "agent-1");
      wt.setup();
      expect(worktrees.create).toHaveBeenCalledWith("agent-1");
      expect(wt.path).toBe("/tmp/wt");
   });

   it("path is undefined before setup", () => {
      const wt = new WorktreeIsolation(makeWorktrees(), "agent-1");
      expect(wt.path).toBeUndefined();
   });

   it("throws when worktree creation fails", () => {
      const worktrees = makeWorktrees({ createResult: undefined });
      const wt = new WorktreeIsolation(worktrees, "agent-1");
      expect(() => wt.setup()).toThrow(/Cannot run with isolation/);
      expect(wt.path).toBeUndefined();
   });
});

describe("WorktreeIsolation — cleanup", () => {
   it("delegates to worktrees.cleanup with the created info and description", () => {
      const worktrees = makeWorktrees();
      const wt = new WorktreeIsolation(worktrees, "agent-1");
      wt.setup();
      wt.cleanup("my task");
      expect(worktrees.cleanup).toHaveBeenCalledOnce();
      expect(worktrees.cleanup).toHaveBeenCalledWith(WT_INFO, "my task");
   });

   it("records and returns the cleanup result", () => {
      const worktrees = makeWorktrees({ cleanupResult: { hasChanges: true, branch: "pi-agent-1" } });
      const wt = new WorktreeIsolation(worktrees, "agent-1");
      wt.setup();
      const result = wt.cleanup("my task");
      expect(result).toEqual({ hasChanges: true, branch: "pi-agent-1" });
      expect(wt.cleanupResult).toEqual({ hasChanges: true, branch: "pi-agent-1" });
   });

   it("cleanupResult is undefined before cleanup", () => {
      const wt = new WorktreeIsolation(makeWorktrees(), "agent-1");
      wt.setup();
      expect(wt.cleanupResult).toBeUndefined();
   });

   it("is a no-op returning hasChanges:false when setup never ran", () => {
      const worktrees = makeWorktrees();
      const wt = new WorktreeIsolation(worktrees, "agent-1");
      const result = wt.cleanup("my task");
      expect(result).toEqual({ hasChanges: false });
      expect(worktrees.cleanup).not.toHaveBeenCalled();
      expect(wt.cleanupResult).toBeUndefined();
   });
});
