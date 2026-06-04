import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ToolStartRuntime } from "#src/handlers/tool-start";
import { ToolStartHandler } from "#src/handlers/tool-start";

describe("ToolStartHandler", () => {
   let runtime: ToolStartRuntime;
   let mockSetUICtx: ReturnType<typeof vi.fn<ToolStartRuntime["setUICtx"]>>;
   let mockOnTurnStart: ReturnType<typeof vi.fn<ToolStartRuntime["onTurnStart"]>>;
   let handler: ToolStartHandler;

   beforeEach(() => {
      mockSetUICtx = vi.fn();
      mockOnTurnStart = vi.fn();
      runtime = {
         setUICtx: mockSetUICtx,
         onTurnStart: mockOnTurnStart
      };
      handler = new ToolStartHandler(runtime);
   });

   describe("handleToolExecutionStart", () => {
      it("calls setUICtx with the context's ui", () => {
         const ui = { setStatus: vi.fn(), setWidget: vi.fn() };

         handler.handleToolExecutionStart({}, { ui });

         expect(runtime.setUICtx).toHaveBeenCalledWith(ui);
      });

      it("calls onTurnStart", () => {
         const ui = { setStatus: vi.fn(), setWidget: vi.fn() };

         handler.handleToolExecutionStart({}, { ui });

         expect(runtime.onTurnStart).toHaveBeenCalled();
      });

      it("calls setUICtx before onTurnStart", () => {
         const callOrder: string[] = [];
         mockSetUICtx.mockImplementation(() => {
            callOrder.push("setUICtx");
         });
         mockOnTurnStart.mockImplementation(() => {
            callOrder.push("onTurnStart");
         });

         const ui = { setStatus: vi.fn(), setWidget: vi.fn() };
         handler.handleToolExecutionStart({}, { ui });

         expect(callOrder).toEqual(["setUICtx", "onTurnStart"]);
      });
   });
});
