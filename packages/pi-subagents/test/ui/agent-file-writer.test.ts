import { beforeEach, describe, expect, it, vi } from "vitest";
import { writeAgentFile } from "#src/ui/agent-file-writer";

function makeFileOps() {
   return {
      exists: vi.fn((_path: string): boolean => false),
      write: vi.fn((_path: string, _content: string): void => {})
   };
}

function makeUI() {
   return {
      confirm: vi.fn((_title: string, _message: string): Promise<boolean> => Promise.resolve(true)),
      notify: vi.fn((_message: string, _level: "info" | "warning" | "error"): void => {})
   };
}

function makeRegistry() {
   return {
      reload: vi.fn((): void => {})
   };
}

beforeEach(() => {
   vi.resetAllMocks();
});

describe("writeAgentFile", () => {
   describe("when target does not exist", () => {
      it("writes the file", async () => {
         const fileOps = makeFileOps();
         const ui = makeUI();
         const registry = makeRegistry();

         await writeAgentFile(fileOps, ui, registry, "/agents/my-agent.md", "content", "Created");

         expect(fileOps.write).toHaveBeenCalledWith("/agents/my-agent.md", "content");
      });

      it("reloads the registry", async () => {
         const fileOps = makeFileOps();
         const ui = makeUI();
         const registry = makeRegistry();

         await writeAgentFile(fileOps, ui, registry, "/agents/my-agent.md", "content", "Created");

         expect(registry.reload).toHaveBeenCalledOnce();
      });

      it("notifies the user with label and path", async () => {
         const fileOps = makeFileOps();
         const ui = makeUI();
         const registry = makeRegistry();

         await writeAgentFile(fileOps, ui, registry, "/agents/my-agent.md", "content", "Created");

         expect(ui.notify).toHaveBeenCalledWith("Created /agents/my-agent.md", "info");
      });

      it("returns true", async () => {
         const fileOps = makeFileOps();
         const ui = makeUI();
         const registry = makeRegistry();

         const result = await writeAgentFile(fileOps, ui, registry, "/agents/my-agent.md", "content", "Created");

         expect(result).toBe(true);
      });

      it("does not prompt for overwrite confirmation", async () => {
         const fileOps = makeFileOps();
         const ui = makeUI();
         const registry = makeRegistry();

         await writeAgentFile(fileOps, ui, registry, "/agents/my-agent.md", "content", "Created");

         expect(ui.confirm).not.toHaveBeenCalled();
      });
   });

   describe("overwrite guard — when target already exists", () => {
      it("prompts for overwrite confirmation", async () => {
         const fileOps = makeFileOps();
         fileOps.exists.mockReturnValue(true);
         const ui = makeUI();
         ui.confirm.mockResolvedValue(false);
         const registry = makeRegistry();

         await writeAgentFile(fileOps, ui, registry, "/agents/my-agent.md", "content", "Created");

         expect(ui.confirm).toHaveBeenCalledWith("Overwrite", "/agents/my-agent.md already exists. Overwrite?");
      });

      it("writes the file and returns true when user confirms overwrite", async () => {
         const fileOps = makeFileOps();
         fileOps.exists.mockReturnValue(true);
         const ui = makeUI();
         ui.confirm.mockResolvedValue(true);
         const registry = makeRegistry();

         const result = await writeAgentFile(fileOps, ui, registry, "/agents/my-agent.md", "content", "Created");

         expect(fileOps.write).toHaveBeenCalledWith("/agents/my-agent.md", "content");
         expect(registry.reload).toHaveBeenCalledOnce();
         expect(ui.notify).toHaveBeenCalledWith("Created /agents/my-agent.md", "info");
         expect(result).toBe(true);
      });

      it("does not write the file and returns false when user declines overwrite", async () => {
         const fileOps = makeFileOps();
         fileOps.exists.mockReturnValue(true);
         const ui = makeUI();
         ui.confirm.mockResolvedValue(false);
         const registry = makeRegistry();

         const result = await writeAgentFile(fileOps, ui, registry, "/agents/my-agent.md", "content", "Created");

         expect(fileOps.write).not.toHaveBeenCalled();
         expect(registry.reload).not.toHaveBeenCalled();
         expect(ui.notify).not.toHaveBeenCalled();
         expect(result).toBe(false);
      });
   });
});
