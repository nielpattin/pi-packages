/**
 * service.ts — Public API surface for cross-extension access to subagents.
 *
 * Consumers declare this package as an optional peer dependency and use
 * dynamic import to access the accessor functions:
 *
 *   const { getSubagentsService } = await import("@nielpattin/pi-subagents");
 *   const svc = getSubagentsService();
 *   svc?.spawn("Explore", "Check for stale TODOs");
 */

import type { LifetimeUsage } from "#src/lifecycle/usage";
import type { WorkspaceProvider } from "#src/lifecycle/workspace";

// Generative extension seam (ADR 0002, Phase 16 Step 2). Only the provider
// entry-point type is re-exported here; a consumer assigning to
// `WorkspaceProvider` gets `Workspace` and the context types via inference.
// The worktrees package (#263) adds named re-exports when it imports them.
export type { LifetimeUsage, WorkspaceProvider };

export type SubagentStatus = "queued" | "running" | "completed" | "steered" | "aborted" | "stopped" | "error";

/** Serializable snapshot of an agent's state — no live session objects. */
export interface SubagentRecord {
   id: string;
   type: string;
   description: string;
   status: SubagentStatus;
   result?: string;
   error?: string;
   toolUses: number;
   startedAt: number;
   completedAt?: number;
   lifetimeUsage: LifetimeUsage;
   compactionCount: number;
   worktreeResult?: { hasChanges: boolean; branch?: string };
}

/** Options for spawning an agent via the service. */
export interface SpawnOptions {
   description?: string;
   model?: string;
   maxTurns?: number;
   thinkingLevel?: string;
   isolated?: boolean;
   inheritContext?: boolean;
   foreground?: boolean;
   bypassQueue?: boolean;
   isolation?: "worktree";
}

/** The public service contract for cross-extension subagent access. */
export interface SubagentsService {
   /** Spawn an agent. Returns the agent ID immediately. */
   spawn(type: string, prompt: string, options?: SpawnOptions): string;

   /** Get a snapshot of an agent's current state. */
   getRecord(id: string): SubagentRecord | undefined;

   /** List all tracked agents, most recent first. */
   listAgents(): SubagentRecord[];

   /** Abort a running or queued agent. Returns false if not found. */
   abort(id: string): boolean;

   /** Send a steering message to a running agent. */
   steer(id: string, message: string): Promise<boolean>;

   /** Wait for all running and queued agents to complete. */
   waitForAll(): Promise<void>;

   /** Whether any agents are running or queued. */
   hasRunning(): boolean;

   /**
    * Register the single workspace provider that supplies a child's working
    * directory plus bracketed setup/teardown. Throws if one is already
    * registered. Returns a disposer that unregisters the provider.
    */
   registerWorkspaceProvider(provider: WorkspaceProvider): () => void;
}

/** Event channel constants for pi.events subscriptions. */
export const SUBAGENT_EVENTS = {
   STARTED: "subagents:started",
   COMPLETED: "subagents:completed",
   ACTIVITY: "subagents:activity"
} as const;

// ---- Accessor functions ----

const SERVICE_KEY = Symbol.for("@nielpattin/pi-subagents:service");

/** Publish the SubagentsService on globalThis for cross-extension access. */
export function publishSubagentsService(service: SubagentsService): void {
   (globalThis as Record<symbol, unknown>)[SERVICE_KEY] = service;
}

/** Retrieve the published SubagentsService, or undefined if not yet published. */
export function getSubagentsService(): SubagentsService | undefined {
   return (globalThis as Record<symbol, unknown>)[SERVICE_KEY] as SubagentsService | undefined;
}

/** Remove the SubagentsService from globalThis (call on shutdown/reload). */
export function unpublishSubagentsService(): void {
   // eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- Symbol-keyed global property; Map.delete() is not applicable
   delete (globalThis as Record<symbol, unknown>)[SERVICE_KEY];
}
