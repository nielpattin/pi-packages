import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { log } from "#core/shared/logger";
import { showDemoStatusDialog } from "../dialogs/status-dialog";
import { sendCtxStatusMessage } from "../commands/pi-command-utils";
import { createStatusDemoController, type StatusDemoSnapshot } from "./status-demo";

export function registerStatusDemoMode(pi: ExtensionAPI): void {
   log("[magic-context-demo] DEMO MODE enabled, real runtime disabled");

   pi.registerCommand("ctx-status", {
      description: "Show Magic Context status demo with fake fixture data",
      handler: async (_args, ctx) => {
         const controller = createStatusDemoController();
         if (ctx.hasUI) {
            await showDemoStatusDialog(ctx, controller);
            return;
         }

         const snapshot = controller.current();
         emitDemoLogs(snapshot);
         sendCtxStatusMessage(pi, {
            title: "/ctx-status demo",
            text: renderDemoText(snapshot),
            level: "info",
         });
      },
   });
}

export function emitDemoLogs(snapshot: StatusDemoSnapshot): void {
   for (const line of snapshot.logs) {
      log(line);
   }
}

function renderDemoText(snapshot: StatusDemoSnapshot): string {
   const s = snapshot.detail;
   return [
      "## Magic Context Status Demo",
      "",
      snapshot.banner,
      "",
      "No database opened. No real state changed.",
      "",
      `Context: ${s.usagePercentage.toFixed(1)}% · ${s.inputTokens} / ${s.contextLimit} tokens`,
      `Tags: active ${s.activeTags}, dropped ${s.droppedTags}, total ${s.totalTags}`,
      `Pending drops: ${s.pendingOpsCount}`,
      `Historian: ${s.historianRunning ? "running" : "idle"}`,
      `Memories: ${s.memoryCount} total, ${s.memoryBlockCount} injected`,
      `Notes: ${s.sessionNoteCount + s.readySmartNoteCount}`,
   ].join("\n");
}
