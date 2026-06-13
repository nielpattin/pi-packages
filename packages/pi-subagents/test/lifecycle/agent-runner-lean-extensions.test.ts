import type { AgentSession } from "@earendil-works/pi-coding-agent";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { runAgent } from "#src/lifecycle/agent-runner";
import { createAgentLookup, createChildLifecycleMock, createRunnerDeps, createRunnerIO } from "#test/helpers/runner-io";
import { STUB_SNAPSHOT } from "#test/helpers/stub-ctx";

const LEAN_ENTRY = "/mock/path/dist/subagent-entry.js";

let io: ReturnType<typeof createRunnerIO>;

function createSession(finalText: string) {
   const listeners: Array<(event: any) => void> = [];
   const session = {
      messages: [] as unknown[],
      subscribe: vi.fn((listener: (event: any) => void) => {
         listeners.push(listener);
         return () => {};
      }),
      prompt: vi.fn(async () => {
         session.messages.push({
            role: "assistant",
            content: [{ type: "text", text: finalText }],
         });
      }),
      abort: vi.fn(),
      steer: vi.fn(),
      getActiveToolNames: vi.fn(() => ["read"]),
      setActiveToolsByName: vi.fn(),
      bindExtensions: vi.fn(async () => {}),
   };
   return { session, listeners };
}

beforeEach(() => {
   io = createRunnerIO();
});

describe("lean magic-context entry in subagent sessions", () => {
   it("passes leanExtensionPaths as additionalExtensionPaths when extensions: true", async () => {
      const { session } = createSession("LEAN_OK");
      io.createSession.mockResolvedValue({ session });

      const lookup = createAgentLookup({ extensions: true });
      await runAgent(
         STUB_SNAPSHOT,
         "Explore",
         "Say LEAN_OK",
         { context: {} },
         createRunnerDeps({ io, registry: lookup, leanExtensionPaths: [LEAN_ENTRY] }),
      );

      expect(io.createResourceLoader).toHaveBeenCalledWith(
         expect.objectContaining({
            noExtensions: true,
            additionalExtensionPaths: [LEAN_ENTRY],
         }),
      );
   });

   it("keeps noExtensions: false when leanExtensionPaths is empty and extensions: true", async () => {
      const { session } = createSession("FULL_OK");
      io.createSession.mockResolvedValue({ session });

      const lookup = createAgentLookup({ extensions: true });
      await runAgent(
         STUB_SNAPSHOT,
         "Explore",
         "Say FULL_OK",
         { context: {} },
         createRunnerDeps({ io, registry: lookup, leanExtensionPaths: [] }),
      );

      expect(io.createResourceLoader).toHaveBeenCalledWith(
         expect.objectContaining({
            noExtensions: false,
         }),
      );
   });

   it("keeps noExtensions: true when leanExtensionPaths is set but extensions: false", async () => {
      const { session } = createSession("LEAN_FALSE");
      io.createSession.mockResolvedValue({ session });

      const lookup = createAgentLookup({ extensions: false });
      await runAgent(
         STUB_SNAPSHOT,
         "Explore",
         "Say LEAN_FALSE",
         { context: {} },
         createRunnerDeps({ io, registry: lookup, leanExtensionPaths: [LEAN_ENTRY] }),
      );

      expect(io.createResourceLoader).toHaveBeenCalledWith(
         expect.objectContaining({
            noExtensions: true,
         }),
      );
   });

   it("does not pass additionalExtensionPaths when leanExtensionPaths is not set", async () => {
      const { session } = createSession("NO_LEAN");
      io.createSession.mockResolvedValue({ session });

      const lookup = createAgentLookup({ extensions: true });
      await runAgent(
         STUB_SNAPSHOT,
         "Explore",
         "Say NO_LEAN",
         { context: {} },
         createRunnerDeps({ io, registry: lookup }), // no leanExtensionPaths
      );

      const opts = io.createResourceLoader.mock.calls[0][0];
      expect(opts.noExtensions).toBe(false);
      expect(opts).not.toHaveProperty("additionalExtensionPaths");
   });

   it("session still binds extensions and runs successfully with lean paths", async () => {
      const { session } = createSession("SUCCESS");
      io.createSession.mockResolvedValue({ session });

      const lookup = createAgentLookup({ extensions: true });
      const result = await runAgent(
         STUB_SNAPSHOT,
         "Explore",
         "Say SUCCESS",
         { context: {} },
         createRunnerDeps({ io, registry: lookup, leanExtensionPaths: [LEAN_ENTRY] }),
      );

      expect(result.responseText).toBe("SUCCESS");
      // bindExtensions must still be called (lean entry tools register via it)
      expect(session.bindExtensions).toHaveBeenCalledTimes(1);
   });

   it("post-bind recursion guard still runs when lean paths are active (extensions: true)", async () => {
      const { session } = createSession("GUARDED");
      io.createSession.mockResolvedValue({ session });

      const lookup = createAgentLookup({ extensions: true });
      await runAgent(
         STUB_SNAPSHOT,
         "Explore",
         "Say GUARDED",
         { context: {} },
         createRunnerDeps({ io, registry: lookup, leanExtensionPaths: [LEAN_ENTRY] }),
      );

      // The recursion guard (setActiveToolsByName) must still run post-bind
      expect(session.setActiveToolsByName).toHaveBeenCalledTimes(1);
      const bindOrder = session.bindExtensions.mock.invocationCallOrder[0];
      const setOrder = session.setActiveToolsByName.mock.invocationCallOrder[0];
      expect(setOrder).toBeGreaterThan(bindOrder);
   });
});
