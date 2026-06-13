/* eslint-disable @typescript-eslint/no-unsafe-argument -- Pi SDK types are not fully exported; see upstream Pi SDK for type improvements */
/**
 * pi-agents — A pi extension providing Claude Code-style autonomous sub-agents.
 *
 * Tools:
 *   Agent             — LLM-callable: spawn a sub-agent
 *   get_subagent_result  — LLM-callable: check background agent status/result
 *   steer_subagent       — LLM-callable: send a steering message to a running agent
 *
 * Commands:
 *   /agents                 — Interactive agent management menu
 *   /orchestrator           - Toggle orchestrator mode (injects sub-agent guidance into system prompt)
 */

import { join } from "node:path";
import {
   createAgentSession,
   DefaultResourceLoader,
   type ExtensionAPI,
   getAgentDir,
   SettingsManager as SdkSettingsManager,
   SessionManager,
} from "@earendil-works/pi-coding-agent";
import { AgentTypeRegistry } from "#src/config/agent-types";
import { loadCustomAgents } from "#src/config/custom-agents";
import { buildOrchestratorGuidance } from "#src/config/orchestrator-guidance";
import { SessionLifecycleHandler, ToolStartHandler } from "#src/handlers/index";
import { AgentManager, type AgentManagerObserver } from "#src/lifecycle/agent-manager";
import { ConcreteAgentRunner, type RunnerDeps } from "#src/lifecycle/agent-runner";
import { createChildLifecyclePublisher } from "#src/lifecycle/child-lifecycle";
import { ConcurrencyQueue } from "#src/lifecycle/concurrency-queue";
import { buildParentSnapshot } from "#src/lifecycle/parent-snapshot";
import { GitWorktreeManager } from "#src/lifecycle/worktree";
import { buildEventData, type NotificationDetails, NotificationManager } from "#src/observation/notification";
import { createNotificationRenderer } from "#src/observation/renderer";
import { createSubagentRuntime } from "#src/runtime";
import { publishSubagentsService, unpublishSubagentsService } from "#src/service/service";
import { SubagentsServiceAdapter } from "#src/service/service-adapter";
import { detectEnv } from "#src/session/env";

import { resolveModel } from "#src/session/model-resolver";
import { buildAgentPrompt } from "#src/session/prompts";
import { deriveSubagentSessionDir } from "#src/session/session-dir";
import { preloadSkills } from "#src/session/skill-loader";
import { resolveLeanMagicContextEntry } from "#src/session/lean-extensions";
import { SettingsManager } from "#src/settings";
import { AgentTool } from "#src/tools/agent-tool";
import { GetResultTool } from "#src/tools/get-result-tool";
import { SteerTool } from "#src/tools/steer-tool";
import { FsAgentFileOps } from "#src/ui/agent-file-ops";
import { AgentsMenuHandler } from "#src/ui/agent-menu";
import { AgentWidget } from "#src/ui/agent-widget";

export default function (pi: ExtensionAPI) {
   // ---- Resolve lean magic-context entry for subagent children ----
   // When available, subagents load only the tool surface (ctx_search, ctx_memory,
   // ctx_note, ctx_expand) instead of the full magic-context extension, avoiding
   // recursion risk, wasted startup, and unexpected prompt injection.
   const leanEntryPath = resolveLeanMagicContextEntry();

   // ---- Register custom notification renderer ----
   pi.registerMessageRenderer<NotificationDetails>("subagent-notification", createNotificationRenderer());

   // Mutable session state for trust-gating project agents.
   // Start global-only; session_start updates from ctx.
   let currentCwd = process.cwd();
   const registry = new AgentTypeRegistry(() => loadCustomAgents(currentCwd, { includeProject: false }));

   // ---- Runtime: all mutable extension state in one place ----
   const runtime = createSubagentRuntime();

   // ---- Notification system ----
   // runtime.widget is assigned after AgentManager construction; arrow closures
   // capture `runtime` by reference so they always read the current value.
   const notifications = new NotificationManager(
      (msg, opts) => pi.sendMessage(msg, opts),
      runtime.agentActivity,
      (id) => runtime.markFinished(id),
      () => runtime.update(),
   );

   // Settings: owns all three in-memory values and handles load/save/emit.
   // onMaxConcurrentChanged is wired to the queue directly (closure captures by reference).
   const settings = new SettingsManager({
      emit: (event, payload) => pi.events.emit(event, payload),
      cwd: () => currentCwd,
      agentDir: getAgentDir(),
      onMaxConcurrentChanged: () => queue.drain(),
   });
   settings.load();

   // Observer: receives agent lifecycle notifications and dispatches events/notifications.
   const observer: AgentManagerObserver = {
      onAgentStarted(record) {
         // Emit started event when agent transitions to running (including from queue).
         pi.events.emit("subagents:started", {
            id: record.id,
            type: record.type,
            description: record.description,
         });
      },
      onAgentCompleted(record) {
         // Emit lifecycle event based on terminal status.
         const isError = record.status === "error" || record.status === "stopped" || record.status === "aborted";
         const eventData = buildEventData(record);
         if (isError) {
            pi.events.emit("subagents:failed", eventData);
         } else {
            pi.events.emit("subagents:completed", eventData);
         }

         // Persist final record for cross-extension history reconstruction.
         pi.appendEntry("subagents:record", {
            id: record.id,
            type: record.type,
            description: record.description,
            status: record.status,
            result: record.result,
            error: record.error,
            startedAt: record.startedAt,
            completedAt: record.completedAt,
         });

         // Skip notification if result was already consumed via get_subagent_result.
         if (record.notification?.resultConsumed) {
            notifications.cleanupCompleted(record.id);
            return;
         }

         notifications.sendCompletion(record);
      },
      onAgentCompacted(record, info) {
         // Emit compacted event when agent's session compacts (preserves count on record).
         pi.events.emit("subagents:compacted", {
            id: record.id,
            type: record.type,
            description: record.description,
            reason: info.reason,
            tokensBefore: info.tokensBefore,
            compactionCount: record.compactionCount,
         });
      },
      onAgentCreated(record) {
         // Emit created event for background agents (before startAgent / queue drain).
         pi.events.emit("subagents:created", {
            id: record.id,
            type: record.type,
            description: record.description,
            isBackground: true,
         });
      },
   };

   const runnerDeps: RunnerDeps = {
      io: {
         detectEnv,
         getAgentDir,
         createResourceLoader: (opts) => new DefaultResourceLoader(opts),
         deriveSessionDir: deriveSubagentSessionDir,
         createSessionManager: (cwd, dir) => SessionManager.create(cwd, dir),
         createSettingsManager: (cwd, dir) => SdkSettingsManager.create(cwd, dir),
         createSession: (opts) => createAgentSession(opts as any),
         assemblerIO: {
            preloadSkills,
            buildAgentPrompt,
         },
      },
      exec: (cmd, args, opts) => pi.exec(cmd, args, opts),
      registry,
      lifecycle: createChildLifecyclePublisher((channel, data) => pi.events.emit(channel, data)),
      ...(leanEntryPath ? { leanExtensionPaths: [leanEntryPath] } : {}),
   };

   // ConcurrencyQueue: scheduling extracted from AgentManager.
   // startAgent callback forward-references manager via closure (safe — drain is never called during construction).
   const queue = new ConcurrencyQueue(
      () => settings.maxConcurrent,
      (id) => {
         const agent = manager.getRecord(id);
         if (agent?.status !== "queued") return;
         agent.promise = agent.run();
      },
   );

   const manager = new AgentManager({
      runner: new ConcreteAgentRunner(runnerDeps),
      worktrees: new GitWorktreeManager(() => currentCwd),
      baseCwd: () => currentCwd,
      observer,
      queue,
      getRunConfig: () => settings,
   });

   // Typed service published via Symbol.for() for cross-extension access.
   // Consumers: const { getSubagentsService } = await import("@nielpattin/pi-subagents");
   const service = new SubagentsServiceAdapter(manager, resolveModel, runtime);
   publishSubagentsService(service);

   const lifecycle = new SessionLifecycleHandler(
      runtime,
      manager,
      () => notifications.dispose(),
      unpublishSubagentsService,
   );

   pi.on("session_start", (event, ctx) => {
      lifecycle.handleSessionStart(event, ctx);
      // Trust-gate project agents: update loader from session ctx.
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any -- isProjectTrusted is a runtime method on ExtensionContext not yet in SDK types
      const ctxAny = ctx as any;
      currentCwd = ctxAny.cwd as string;
      const trusted = typeof ctxAny.isProjectTrusted === "function" ? (ctxAny.isProjectTrusted() as boolean) : true;
      registry.setLoader(() => loadCustomAgents(currentCwd, { includeProject: trusted }));
      registry.reload();
   });
   pi.on("session_before_switch", () => lifecycle.handleSessionBeforeSwitch());
   pi.on("session_shutdown", () => lifecycle.handleSessionShutdown());

   // Live widget: show running agents above editor
   runtime.widget = new AgentWidget(manager, runtime.agentActivity, registry);

   // Grab UI context from first tool execution + clear lingering widget on new turn
   const toolStart = new ToolStartHandler(runtime);
   pi.on("tool_execution_start", (event, ctx) => toolStart.handleToolExecutionStart(event, ctx));

   // ---- Agent tool ----

   pi.registerTool(new AgentTool(manager, runtime, settings, registry, getAgentDir()).toToolDefinition());

   // ---- get_subagent_result tool ----

   pi.registerTool(new GetResultTool(manager, notifications, registry).toToolDefinition());

   // ---- steer_subagent tool ----

   pi.registerTool(new SteerTool(manager, pi.events).toToolDefinition());

   // ---- Orchestrator mode ----

   pi.on("before_agent_start", (event) => {
      if (!runtime.orchestratorMode) return {};

      const guidance = buildOrchestratorGuidance(registry);
      if (!guidance) return {};

      return {
         systemPrompt: event.systemPrompt + "\n\n" + guidance,
      };
   });

   pi.registerCommand("orchestrator", {
      description: "Toggle orchestrator mode (injects enabled agent guidance into system prompt)",
      handler: async (args, _ctx) => {
         const command = args.trim().toLowerCase();
         if (command === "off") {
            runtime.orchestratorMode = false;
            pi.sendMessage({
               customType: "orchestrator",
               content: "Orchestrator mode **disabled**.",
               display: true,
            });
            return;
         }

         if (command === "on" || !runtime.orchestratorMode) {
            runtime.orchestratorMode = true;
            const guidance = buildOrchestratorGuidance(registry);
            const count = guidance
               ? registry.getAvailableTypes().filter((type) => registry.resolveAgentConfig(type).guidance?.trim())
                    .length
               : 0;
            pi.sendMessage({
               customType: "orchestrator",
               content:
                  `Orchestrator mode **enabled**. Guidance will be loaded from ${count} enabled agent config${count === 1 ? "" : "s"}. ` +
                  "Use `/orchestrator off` or `/orchestrator` again to disable.",
               display: true,
            });
            return;
         }

         runtime.orchestratorMode = false;
         pi.sendMessage({
            customType: "orchestrator",
            content: "Orchestrator mode **disabled**.",
            display: true,
         });
      },
   });

   // ---- /agents interactive menu ----

   const agentsMenu = new AgentsMenuHandler(
      manager,
      registry,
      runtime.agentActivity,
      settings,
      new FsAgentFileOps(),
      join(getAgentDir(), "agents"),
      () => join(currentCwd, ".pi", "agents"),
   );

   pi.registerCommand("agents", {
      description: "Manage agents",
      handler: async (_args, ctx) => {
         if (!ctx.hasUI) {
            pi.sendMessage({
               customType: "agents",
               content: "/agents is only available in TUI mode.",
               display: true,
            });
            return;
         }

         await agentsMenu.handle({
            ui: ctx.ui,
            modelRegistry: ctx.modelRegistry,
            parentSnapshot: buildParentSnapshot(ctx),
         });
      },
   });
}
