import { vi, describe, expect, it } from "vitest";

import registerExtension from "./index.js";

describe("pi-simplify extension", () => {
   it("registers the simplify command", () => {
      const pi = {
         on: vi.fn(),
         registerCommand: vi.fn()
      } as unknown as Parameters<typeof registerExtension>[0];

      registerExtension(pi);

      expect(pi.registerCommand).toHaveBeenCalledOnce();
      expect(pi.registerCommand).toHaveBeenCalledWith(
         "simplify",
         expect.objectContaining({
            description: expect.any(String),
            handler: expect.any(Function)
         })
      );
   });

   it("does not register any event handlers", () => {
      const pi = {
         on: vi.fn(),
         registerCommand: vi.fn()
      } as unknown as Parameters<typeof registerExtension>[0];

      registerExtension(pi);

      expect(pi.on).not.toHaveBeenCalled();
   });
});
