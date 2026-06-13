import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("#src/ui/agent-menu", () => {
   const AgentsMenuHandler = vi.fn();
   AgentsMenuHandler.prototype.handle = vi.fn();
   return { AgentsMenuHandler };
});

import subagentsExtension from "#src/index";
import { AgentsMenuHandler } from "#src/ui/agent-menu";

function makePi() {
   const tools = new Map<string, any>();
   const handlers = new Map<string, any>();
   const commands = new Map<string, any>();

   return {
      pi: {
         registerMessageRenderer: vi.fn(),
         registerTool: vi.fn((tool: any) => {
            tools.set(tool.name, tool);
         }),
         registerCommand: vi.fn((name: string, opts: any) => {
            commands.set(name, opts);
         }),
         on: vi.fn((event: string, handler: any) => {
            handlers.set(event, handler);
         }),
         events: {
            emit: vi.fn(),
            on: vi.fn((event: string, handler: any) => {
               handlers.set(event, handler);
               return vi.fn();
            }),
         },
         appendEntry: vi.fn(),
         sendMessage: vi.fn(),
      } as any,
      tools,
      handlers,
      commands,
   };
}

function makeCtx(overrides: Partial<{ hasUI: boolean }> = {}) {
   return {
      hasUI: overrides.hasUI ?? true,
      ui: {
         setStatus: vi.fn(),
         setWidget: vi.fn(),
         select: vi.fn(),
         input: vi.fn(),
         confirm: vi.fn(),
         editor: vi.fn(),
         notify: vi.fn(),
         custom: vi.fn(),
      },
      cwd: "/tmp",
      model: undefined,
      modelRegistry: {
         find: vi.fn(),
         getAvailable: vi.fn(() => []),
      },
      sessionManager: {
         getSessionId: vi.fn(() => "session-1"),
         getSessionFile: vi.fn(() => "/sessions/parent.jsonl"),
         getBranch: vi.fn(() => []),
      },
      getSystemPrompt: vi.fn(() => "parent prompt"),
   } as any;
}

describe("/agents command mode guard", () => {
   afterEach(() => {
      vi.restoreAllMocks();
   });

   it("sends a message and returns early when not in TUI mode", async () => {
      const { pi, commands } = makePi();
      subagentsExtension(pi);

      const agentsCmd = commands.get("agents");
      expect(agentsCmd).toBeDefined();

      const handleSpy = vi.mocked(AgentsMenuHandler.prototype.handle);
      handleSpy.mockClear();

      await agentsCmd.handler("", makeCtx({ hasUI: false }));

      expect(pi.sendMessage).toHaveBeenCalledWith(
         expect.objectContaining({
            content: expect.stringContaining("TUI mode"),
            display: true,
         }),
      );
      expect(handleSpy).not.toHaveBeenCalled();
   });

   it("allows /agents in TUI mode", async () => {
      const { pi, commands } = makePi();
      subagentsExtension(pi);

      const agentsCmd = commands.get("agents");
      const handleSpy = vi.mocked(AgentsMenuHandler.prototype.handle);
      handleSpy.mockClear();

      await agentsCmd.handler("", makeCtx({ hasUI: true }));

      expect(handleSpy).toHaveBeenCalled();
   });
});
