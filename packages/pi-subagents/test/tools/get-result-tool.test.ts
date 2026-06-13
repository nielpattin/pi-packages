import { describe, expect, it, vi } from "vitest";
import { AgentTypeRegistry } from "#src/config/agent-types";
import { NotificationState } from "#src/observation/notification-state";
import { GetResultTool, type GetResultToolManager, type GetResultToolNotifications } from "#src/tools/get-result-tool";
import type { Agent } from "#src/types";
import { createTestAgent } from "#test/helpers/make-agent";
import { createMockSession, toAgentSession } from "#test/helpers/mock-session";
import { STUB_CTX } from "#test/helpers/stub-ctx";

const testRegistry = new AgentTypeRegistry(() => new Map());

function makeTheme() {
   return {
      fg: (color: string, text: string) => `[${color}:${text}]`,
      bold: (text: string) => `**${text}**`,
   };
}

function makeManager(records: Map<string, Agent> = new Map()): GetResultToolManager {
   return { getRecord: (id: string) => records.get(id) };
}

function makeNotifications() {
   return { cancelNudge: vi.fn() };
}

async function execute(
   manager: GetResultToolManager,
   notifications: GetResultToolNotifications,
   params: { agent_id: string; wait?: boolean },
) {
   const tool = new GetResultTool({ manager, notifications }, testRegistry);
   return tool.execute("tc-1", params, new AbortController().signal, undefined, STUB_CTX);
}

describe("GetResultTool", () => {
   it("returns tool definition with correct name", () => {
      const tool = new GetResultTool({ manager: makeManager(), notifications: makeNotifications() }, testRegistry);
      expect(tool.toToolDefinition().name).toBe("get_subagent_result");
   });

   it("includes promptSnippet", () => {
      const tool = new GetResultTool({ manager: makeManager(), notifications: makeNotifications() }, testRegistry);
      expect(tool.toToolDefinition().promptSnippet).toBe(
         "get_subagent_result: Check status and retrieve results from a background agent.",
      );
   });

   it("exposes only agent_id and wait parameters", () => {
      const tool = new GetResultTool({ manager: makeManager(), notifications: makeNotifications() }, testRegistry);
      const parameters = tool.toToolDefinition().parameters as {
         properties: Record<string, unknown>;
      };

      expect(parameters.properties).toHaveProperty("agent_id");
      expect(parameters.properties).toHaveProperty("wait");
      expect(parameters.properties).not.toHaveProperty("verbose");
   });

   it("describes wait as an explicit blocking action", () => {
      const tool = new GetResultTool({ manager: makeManager(), notifications: makeNotifications() }, testRegistry);
      const parameters = tool.toToolDefinition().parameters as {
         properties: { wait?: { description?: string } };
      };

      expect(tool.toToolDefinition().description).toBe(
         "Check status and retrieve results from a background agent. Use wait: true only when the user asked to wait for completion.",
      );
      expect(parameters.properties.wait?.description).toBe(
         "If true, block until completion. Use only when the user asked to wait. Default: false.",
      );
   });

   it("renders collapsed and expanded result output", async () => {
      const records = new Map([["agent-1", createTestAgent({ result: "line one\nline two", completedAt: 3500 })]]);
      const tool = new GetResultTool(
         { manager: makeManager(records), notifications: makeNotifications() },
         testRegistry,
      );
      const result = await tool.execute(
         "tc-1",
         { agent_id: "agent-1" },
         new AbortController().signal,
         undefined,
         STUB_CTX,
      );
      const renderResult = tool.toToolDefinition().renderResult;

      expect(renderResult).toBeTypeOf("function");
      const collapsed = renderResult!(result, { expanded: false, isPartial: false }, makeTheme() as never, {} as never)
         .render(120)
         .join("\n");
      const expanded = renderResult!(result, { expanded: true, isPartial: false }, makeTheme() as never, {} as never)
         .render(120)
         .join("\n");

      expect(collapsed).toContain("[success:✓]");
      expect(collapsed).toContain("[dim:  ⎿  Done]");
      expect(collapsed).not.toContain("line one");
      expect(expanded).toContain("[dim:  line one]");
      expect(expanded).toContain("[dim:  line two]");
   });

   it("renders every expanded result line without overflow or verbose hints", async () => {
      const manyLines = Array.from({ length: 55 }, (_, i) => `line ${i + 1}`).join("\n");
      const records = new Map([["agent-1", createTestAgent({ result: manyLines, completedAt: 3500 })]]);
      const tool = new GetResultTool(
         { manager: makeManager(records), notifications: makeNotifications() },
         testRegistry,
      );
      const result = await tool.execute(
         "tc-1",
         { agent_id: "agent-1" },
         new AbortController().signal,
         undefined,
         STUB_CTX,
      );
      const renderResult = tool.toToolDefinition().renderResult;

      expect(renderResult).toBeTypeOf("function");
      const expanded = renderResult!(result, { expanded: true, isPartial: false }, makeTheme() as never, {} as never)
         .render(120)
         .join("\n");

      expect(expanded).toContain("[dim:  line 51]");
      expect(expanded).toContain("[dim:  line 55]");
      expect(expanded).not.toContain("overflow");
      expect(expanded).not.toContain("verbose");
      expect(expanded).not.toContain("use get_subagent_result");
   });

   it("returns not-found message for unknown agent ID", async () => {
      await expect(execute(makeManager(), makeNotifications(), { agent_id: "unknown" })).rejects.toThrow(
         "Agent not found",
      );
   });

   it("returns status and result for completed agent", async () => {
      const records = new Map([["agent-1", createTestAgent()]]);
      const result = await execute(makeManager(records), makeNotifications(), { agent_id: "agent-1" });
      const text = result.content[0].text;
      expect(text).toContain("Agent: agent-1");
      expect(text).toContain("completed");
      expect(text).toContain("All done.");
   });

   it("shows running message for in-progress agent", async () => {
      const records = new Map([["agent-1", createTestAgent({ status: "running", completedAt: undefined })]]);
      const result = await execute(makeManager(records), makeNotifications(), { agent_id: "agent-1" });
      expect(result.content[0].text).toContain(
         "Agent is still running. Check back later, or use wait: true only if the user asked to wait.",
      );
   });

   it("shows error for failed agent", async () => {
      const records = new Map([["agent-1", createTestAgent({ status: "error", error: "timeout" })]]);
      const result = await execute(makeManager(records), makeNotifications(), { agent_id: "agent-1" });
      expect(result.content[0].text).toContain("Error: timeout");
   });

   it("marks notification consumed and cancels nudge for completed agent", async () => {
      const record = createTestAgent();
      record.notification = new NotificationState("tc-1");
      const records = new Map([["agent-1", record]]);
      const notifications = makeNotifications();
      await execute(makeManager(records), notifications, { agent_id: "agent-1" });
      expect(record.notification.resultConsumed).toBe(true);
      expect(notifications.cancelNudge).toHaveBeenCalledWith("agent-1");
   });

   it("still cancels nudge for completed agent without NotificationState", async () => {
      const record = createTestAgent();
      const records = new Map([["agent-1", record]]);
      const notifications = makeNotifications();
      await execute(makeManager(records), notifications, { agent_id: "agent-1" });
      expect(notifications.cancelNudge).toHaveBeenCalledWith("agent-1");
   });

   it("does not cancel nudge for running agent", async () => {
      const record = createTestAgent({ status: "running", completedAt: undefined });
      const records = new Map([["agent-1", record]]);
      const notifications = makeNotifications();
      await execute(makeManager(records), notifications, { agent_id: "agent-1" });
      expect(notifications.cancelNudge).not.toHaveBeenCalled();
   });

   it("waits for promise when wait=true and agent is running", async () => {
      const record = createTestAgent({
         status: "running",
         completedAt: undefined,
      });
      record.promise = Promise.resolve().then(() => {
         record.markCompleted("Finished after wait.");
      });
      const records = new Map([["agent-1", record]]);
      const result = await execute(makeManager(records), makeNotifications(), { agent_id: "agent-1", wait: true });
      // After waiting, the record is completed and result is shown
      expect(result.content[0].text).toContain("Finished after wait.");
   });

   it("calls notification.markConsumed() when record has a NotificationState", async () => {
      const record = createTestAgent();
      record.notification = new NotificationState("tc-1");
      const records = new Map([["agent-1", record]]);
      await execute(makeManager(records), makeNotifications(), { agent_id: "agent-1" });
      expect(record.notification.resultConsumed).toBe(true);
   });

   it("does not include conversation transcript when extra verbose input is provided", async () => {
      const record = createTestAgent();
      const session = createMockSession({ messages: [{ role: "user", content: "hello" }] });
      record.execution = { session: toAgentSession(session), outputFile: undefined };
      const records = new Map([["agent-1", record]]);
      const result = await new GetResultTool(
         { manager: makeManager(records), notifications: makeNotifications() },
         testRegistry,
      ).execute(
         "tc-1",
         { agent_id: "agent-1", verbose: true } as never,
         new AbortController().signal,
         undefined,
         STUB_CTX,
      );

      expect(result.content[0].text).toContain("All done.");
      expect(result.content[0].text).not.toContain("--- Agent Conversation ---");
      expect(result.content[0].text).not.toContain("[User]: hello");
   });
});
