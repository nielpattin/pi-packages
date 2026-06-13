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
import { ToolStartHandler } from "#src/handlers/index";
import type { AgentManagerObserver } from "#src/lifecycle/agent-manager";
import { buildEventData, type NotificationDetails } from "#src/observation/notification";
import { createNotificationRenderer } from "#src/observation/renderer";
import { createSubagentRuntime } from "#src/runtime";
import { SettingsManager } from "#src/settings";
import { AgentTool } from "#src/tools/agent-tool";
import { GetResultTool } from "#src/tools/get-result-tool";
import { SteerTool } from "#src/tools/steer-tool";
import { FsAgentFileOps } from "#src/ui/agent-file-ops";
import type { RunnerDeps } from "#src/lifecycle/agent-runner";

export default function (pi: ExtensionAPI) {
   // ---- Register custom notification renderer ----
   pi.registerMessageRenderer<NotificationDetails>("subagent-notification", createNotificationRenderer());

   // ---- Mutable state set at load time ----
   let currentCwd = process.cwd();
   // Registry loads defaults only at construction — custom agents are loaded in session_start.
   const registry = new AgentTypeRegistry(() => loadCustomAgents(currentCwd, { includeProject: false }));

   // ---- Runtime: cheap container for mutable extension state ----
   const runtime = createSubagentRuntime();

   // ---- Lazy-initialized services (filled by initialize()) ----
   let _initialized = false;
   let _notifications: import("#src/observation/notification").NotificationManager;
   let _settings: SettingsManager;
   let _queue: import("#src/lifecycle/concurrency-queue").ConcurrencyQueue;
   let _manager: import("#src/lifecycle/agent-manager").AgentManager;
   let _lifecycle: import("#src/handlers/lifecycle").SessionLifecycleHandler;
   let _agentsMenu: import("#src/ui/agent-menu").AgentsMenuHandler | undefined;

   // Shared mutable deps container for tool objects — filled by initialize(), read at execute() time.
   const agentToolDeps = {} as import("#src/tools/agent-tool").AgentToolDeps;
   const getResultToolDeps = {} as import("#src/tools/get-result-tool").GetResultToolDeps;
   const steerToolDeps = {} as import("#src/tools/steer-tool").SteerToolDeps;

   // ---- Observer: references lazy _notifications via closure (set during initialize) ----
   const observer: AgentManagerObserver = {
      onAgentStarted(record) {
         pi.events.emit("subagents:started", {
            id: record.id,
            type: record.type,
            description: record.description,
         });
      },
      onAgentCompleted(record) {
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
            _notifications.cleanupCompleted(record.id);
            return;
         }

         _notifications.sendCompletion(record);
      },
      onAgentCompacted(record, info) {
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
         pi.events.emit("subagents:created", {
            id: record.id,
            type: record.type,
            description: record.description,
            isBackground: true,
         });
      },
   };

   // ---- Lazy initialization — runs once on first session_start ----
   async function fullInit(ctxAny: { cwd?: string; isProjectTrusted?: () => boolean }): Promise<void> {
      currentCwd = ctxAny.cwd ?? process.cwd();

      // Dynamic imports — defer loading heavy modules until first session.
      const [
         { NotificationManager },
         { ConcurrencyQueue },
         { AgentManager },
         { SessionLifecycleHandler },
         { resolveLeanMagicContextEntry },
         { resolveModel },
         { SubagentsServiceAdapter },
         { publishSubagentsService, unpublishSubagentsService },
         { ConcreteAgentRunner },
         { GitWorktreeManager },
         { createChildLifecyclePublisher },
         { detectEnv },
         { buildAgentPrompt },
         { preloadSkills },
         { deriveSubagentSessionDir },
         { AgentWidget },
         { AgentsMenuHandler },
      ] = await Promise.all([
         import("#src/observation/notification"),
         import("#src/lifecycle/concurrency-queue"),
         import("#src/lifecycle/agent-manager"),
         import("#src/handlers/lifecycle"),
         import("#src/session/lean-extensions"),
         import("#src/session/model-resolver"),
         import("#src/service/service-adapter"),
         import("#src/service/service"),
         import("#src/lifecycle/agent-runner"),
         import("#src/lifecycle/worktree"),
         import("#src/lifecycle/child-lifecycle"),
         import("#src/session/env"),
         import("#src/session/prompts"),
         import("#src/session/skill-loader"),
         import("#src/session/session-dir"),
         import("#src/ui/agent-widget"),
         import("#src/ui/agent-menu"),
      ]);

      // Resolve lean magic-context entry for subagent children.
      const leanEntryPath = resolveLeanMagicContextEntry();

      // Settings
      _settings = new SettingsManager({
         emit: (event, payload) => pi.events.emit(event, payload),
         cwd: () => currentCwd,
         agentDir: getAgentDir(),
         onMaxConcurrentChanged: () => _queue!.drain(),
      });
      _settings.load();

      // Runner deps (used by ConcreteAgentRunner)
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

      // Concurrency queue
      _queue = new ConcurrencyQueue(
         () => _settings!.maxConcurrent,
         (id) => {
            const agent = _manager.getRecord(id);
            if (agent?.status !== "queued") return;
            agent.promise = agent.run();
         },
      );

      // Agent manager
      _manager = new AgentManager({
         runner: new ConcreteAgentRunner(runnerDeps),
         worktrees: new GitWorktreeManager(() => currentCwd),
         baseCwd: () => currentCwd,
         observer,
         queue: _queue,
         getRunConfig: () => _settings!,
      });

      // Notification system
      _notifications = new NotificationManager(
         (msg, opts) => pi.sendMessage(msg, opts),
         runtime.agentActivity,
         (id) => runtime.markFinished(id),
         () => runtime.update(),
      );

      // Typed service published via Symbol.for() for cross-extension access.
      const service = new SubagentsServiceAdapter(_manager, resolveModel, runtime);
      publishSubagentsService(service);

      // Session lifecycle handler
      _lifecycle = new SessionLifecycleHandler(
         runtime,
         _manager,
         () => _notifications.dispose(),
         unpublishSubagentsService,
      );

      // Live widget: show running agents above editor
      runtime.widget = new AgentWidget(_manager, runtime.agentActivity, registry);

      // Agent menu
      _agentsMenu = new AgentsMenuHandler(
         _manager,
         registry,
         runtime.agentActivity,
         _settings,
         new FsAgentFileOps(),
         join(getAgentDir(), "agents"),
         () => join(currentCwd, ".pi", "agents"),
      );
      // Fill shared tool deps (closures captured by execute methods)
      agentToolDeps.manager = _manager;
      agentToolDeps.runtime = runtime;
      agentToolDeps.settings = _settings;
      getResultToolDeps.manager = _manager;
      getResultToolDeps.notifications = _notifications;
      steerToolDeps.manager = _manager;
      steerToolDeps.events = pi.events;
   }

   // ---- Session-switch update: cwd, trust-gating, settings ----
   function updateForSession(ctxAny: { cwd?: string; isProjectTrusted?: () => boolean }): void {
      currentCwd = ctxAny.cwd ?? currentCwd;
      const trusted = typeof ctxAny.isProjectTrusted === "function" ? (ctxAny.isProjectTrusted() as boolean) : true;
      registry.setLoader(() => loadCustomAgents(currentCwd, { includeProject: trusted }));
      registry.reload();
      _settings?.load(); // re-load on session switch (project-local settings may differ)
   }

   // ---- Register tools at load time (execute deps resolved lazily via toolDeps) ----

   pi.registerTool(new AgentTool(agentToolDeps, registry, getAgentDir()).toToolDefinition());
   pi.registerTool(new GetResultTool(getResultToolDeps, registry).toToolDefinition());
   pi.registerTool(new SteerTool(steerToolDeps).toToolDefinition());

   // ---- Event handlers ----

   pi.on("session_start", async (event, ctx) => {
      try {
         const ctxAny = ctx as { cwd?: string; isProjectTrusted?: () => boolean };
         if (!_initialized) {
            _initialized = true;
            await fullInit(ctxAny);
         }
         if (!_lifecycle) return; // init failed
         updateForSession(ctxAny);
         _lifecycle.handleSessionStart(event, ctx);
      } catch (err) {
         console.error("[pi-subagents] session_start failed:", err);
      }
   });

   pi.on("session_before_switch", () => {
      _lifecycle?.handleSessionBeforeSwitch();
   });

   pi.on("session_shutdown", () => {
      if (_lifecycle) {
         void _lifecycle.handleSessionShutdown();
      } else {
         // Before first init — just clear runtime state
         runtime.clearSessionContext();
      }
   });

   // Grab UI context from first tool execution + clear lingering widget on new turn
   const toolStart = new ToolStartHandler(runtime);
   pi.on("tool_execution_start", (event, ctx) => toolStart.handleToolExecutionStart(event, ctx));

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

   pi.registerCommand("agents", {
      description: "Manage agents",
      handler: async (_args, ctx) => {
         if (!_agentsMenu) {
            pi.sendMessage({
               customType: "agents",
               content: "Subagents extension not yet initialized. Please wait for session to start.",
               display: true,
            });
            return;
         }
         if (!ctx.hasUI) {
            pi.sendMessage({
               customType: "agents",
               content: "/agents is only available in TUI mode.",
               display: true,
            });
            return;
         }

         const { buildParentSnapshot } = await import("#src/lifecycle/parent-snapshot");
         await _agentsMenu.handle({
            ui: ctx.ui,
            modelRegistry: ctx.modelRegistry,
            parentSnapshot: buildParentSnapshot(ctx),
         });
      },
   });
}
