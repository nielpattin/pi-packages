import { describe, expect, test } from "vitest";
import { registerStatusDemoMode } from "../src/demo/register-demo-mode";

describe("status demo mode registration", () => {
   test("registers only demo /ctx-status and sends fake status without database deps", async () => {
      const commands = new Map<string, { handler: (args: unknown, ctx: unknown) => Promise<void> }>();
      const sentMessages: Array<{ message: { content?: string; details?: unknown }; options: unknown }> = [];
      const pi = {
         registerCommand(name: string, command: { handler: (args: unknown, ctx: unknown) => Promise<void> }) {
            commands.set(name, command);
         },
         sendMessage(message: { content?: string; details?: unknown }, options: unknown) {
            sentMessages.push({ message, options });
         },
      };

      registerStatusDemoMode(pi as never);

      expect([...commands.keys()]).toEqual(["ctx-status"]);

      await commands.get("ctx-status")?.handler([], {
         hasUI: false,
         sessionManager: { getSessionId: () => "real-session-ignored" },
      });

      expect(sentMessages).toHaveLength(1);
      expect(sentMessages[0]?.message.content).toContain("DEMO MODE");
      expect(sentMessages[0]?.message.content).toContain("Clean startup");
      expect(sentMessages[0]?.message.content).toContain("No database opened");
      expect(sentMessages[0]?.options).toEqual({ triggerTurn: false });
   });
});
