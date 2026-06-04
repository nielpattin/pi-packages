/**
 * manager-stubs.ts — Shared AgentRunner and WorktreeManager stubs for agent-manager tests.
 *
 * Extracts the four most-repeated inline clone families from agent-manager.test.ts.
 * Tests with unique runner behavior (event-emitting, gated, error-throwing) keep
 * their inline stubs — those encode test-specific sequences a factory would obscure.
 */
import { vi } from "vitest";
import type { AgentRunner, RunResult } from "#src/lifecycle/agent-runner";
import type { WorktreeCleanupResult, WorktreeInfo, WorktreeManager } from "#src/lifecycle/worktree";
import { createMockSession, type MockSession, toAgentSession } from "#test/helpers/mock-session";

// ── createBlockingRunner ─────────────────────────────────────────────────────

/**
 * AgentRunner whose `run()` returns a promise that never resolves.
 *
 * Use when a test needs an agent to stay in the "running" state indefinitely
 * (e.g., to inspect queued records or test abort behavior).
 */
export function createBlockingRunner(): AgentRunner {
   return {
      run: vi.fn().mockImplementation(() => new Promise<RunResult>(() => {})),
      resume: vi.fn()
   };
}

// ── createRunResult ──────────────────────────────────────────────────────────

/**
 * Standard RunResult shape with sensible defaults.
 *
 * Pass an existing MockSession when the test needs to reference the same session
 * object after the run (e.g., to assert dispose was called on it).
 */
export function createRunResult(session?: MockSession): RunResult {
   const sess = session ?? createMockSession();
   return {
      responseText: "done",
      session: toAgentSession(sess),
      aborted: false,
      steered: false
   };
}

// ── createSessionRunner ──────────────────────────────────────────────────────

/**
 * AgentRunner that fires `onSessionCreated` with the given session and resolves.
 *
 * Use when the test needs `onSessionCreated` to fire so that the record observer
 * subscribes or execution state is captured.
 */
export function createSessionRunner(session: MockSession): AgentRunner {
   return {
      run: vi
         .fn()
         .mockImplementation(
            async (
               _snapshot: unknown,
               _type: unknown,
               _prompt: unknown,
               opts: { onSessionCreated?: (s: unknown) => void }
            ) => {
               opts.onSessionCreated?.(session);
               return createRunResult(session);
            }
         ),
      resume: vi.fn()
   };
}

// ── createMockWorktrees ──────────────────────────────────────────────────────

/** Default path and branch returned by the worktree create stub. */
const DEFAULT_WORKTREE: WorktreeInfo = { path: "/tmp/wt", branch: "pi-agent-x" };

/**
 * WorktreeManager stub with sensible defaults.
 *
 * - `create` returns `{ path: "/tmp/wt", branch: "pi-agent-x" }` by default.
 * - `cleanup` returns `{ hasChanges: false }` by default.
 * - Pass `createResult: undefined` to simulate a non-git-repo (create returns undefined).
 * - Pass `cleanupResult` to control the cleanup outcome (e.g., `{ hasChanges: true, branch: "pi-agent-x" }`).
 */
export function createMockWorktrees(overrides?: {
   createResult?: WorktreeInfo | undefined;
   cleanupResult?: WorktreeCleanupResult;
}): WorktreeManager {
   // Distinguish "no override" (use default) from "explicit undefined" (simulate failure).
   const createReturn =
      overrides !== undefined && "createResult" in overrides ? overrides.createResult : DEFAULT_WORKTREE;
   const cleanupReturn: WorktreeCleanupResult = overrides?.cleanupResult ?? { hasChanges: false };

   return {
      create: vi.fn().mockReturnValue(createReturn),
      cleanup: vi.fn(() => cleanupReturn),
      prune: vi.fn()
   };
}
