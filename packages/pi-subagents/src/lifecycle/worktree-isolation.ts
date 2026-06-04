/**
 * worktree-isolation.ts — WorktreeIsolation: collaborator that owns the
 * git-worktree lifecycle for an isolated agent.
 *
 * Constructed by AgentManager only when isolation === "worktree", bound to a
 * WorktreeManager and the agent id. Agent tells it `setup()` and
 * `cleanup(description)` instead of managing worktree internals itself.
 *
 * The presence/absence of this collaborator IS the isolation mode: Agent calls
 * `this.worktree?.setup()` rather than checking an isolation string.
 */

import type { WorktreeCleanupResult, WorktreeInfo, WorktreeManager } from "#src/lifecycle/worktree";

export class WorktreeIsolation {
   private _info?: WorktreeInfo;
   private _cleanupResult?: WorktreeCleanupResult;

   constructor(
      private readonly worktrees: WorktreeManager,
      private readonly agentId: string
   ) {}

   /** Absolute worktree path — undefined before setup(). */
   get path(): string | undefined {
      return this._info?.path;
   }

   /** Cleanup outcome — undefined until cleanup() runs. */
   get cleanupResult(): WorktreeCleanupResult | undefined {
      return this._cleanupResult;
   }

   /**
    * Create the git worktree and store its info.
    * Throws on failure (strict isolation — no silent fallback).
    */
   setup(): void {
      const wt = this.worktrees.create(this.agentId);
      if (!wt) {
         throw new Error(
            'Cannot run with isolation: "worktree" — not a git repo, no commits yet, or `git worktree add` failed. ' +
               "Initialize git and commit at least once, or omit `isolation`."
         );
      }
      this._info = wt;
   }

   /**
    * Perform worktree cleanup and record the result.
    * No-op returning { hasChanges: false } if setup never ran.
    */
   cleanup(description: string): WorktreeCleanupResult {
      if (!this._info) return { hasChanges: false };
      const result = this.worktrees.cleanup(this._info, description);
      this._cleanupResult = result;
      return result;
   }
}
