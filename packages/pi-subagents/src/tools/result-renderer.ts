/**
 * result-renderer.ts — Pure per-status rendering functions for Agent tool results.
 *
 * All functions are stateless: they receive AgentDetails and a Theme, returning
 * formatted strings. No SDK types, no timers, no side effects.
 * Consumed by the renderResult hook in agent-tool.ts.
 */

import type { AgentDetails, Theme } from "#src/ui/display";
import { formatMs, formatTurns, SPINNER } from "#src/ui/display";

export interface RenderAgentResultOptions {
   expandedLineLimit?: number | null;
   overflowHint?: string | null;
}

const DEFAULT_OVERFLOW_HINT = "  ... (use get_subagent_result with verbose for full output)";

// ---- Dispatcher ----

/** Dispatch to the per-status renderer based on details.status and isPartial. */
export function renderAgentResult(
   details: AgentDetails,
   resultText: string,
   expanded: boolean,
   isPartial: boolean,
   theme: Theme,
   options?: RenderAgentResultOptions,
): string {
   if (isPartial || details.status === "running") return renderRunning(details, theme);
   if (details.status === "background") return renderBackground(details, theme);
   if (details.status === "completed" || details.status === "steered")
      return renderCompleted(details, resultText, expanded, theme, options);
   if (details.status === "stopped") return renderStopped(details, theme);
   return renderFailed(details, theme);
}

// ---- Per-status renderers ----

/** Render running/partial status: spinner + stats + activity line. */
export function renderRunning(details: AgentDetails, theme: Theme): string {
   const frame = SPINNER[details.spinnerFrame ?? 0];
   const s = renderStats(details, theme);
   let line = theme.fg("accent", frame) + (s ? " " + s : "");
   line += "\n" + theme.fg("dim", `  ⎿  ${details.activity ?? "thinking\u2026"}`);
   return line;
}

/** Render background launch status. */
export function renderBackground(details: AgentDetails, theme: Theme): string {
   return theme.fg("dim", `  \u23BF  Running in background (ID: ${details.agentId})`);
}

/** Render completed or steered status with optional expanded result text. */
export function renderCompleted(
   details: AgentDetails,
   resultText: string,
   expanded: boolean,
   theme: Theme,
   options: RenderAgentResultOptions = {},
): string {
   const duration = formatMs(details.durationMs);
   const isSteered = details.status === "steered";
   const icon = isSteered ? theme.fg("warning", "\u2713") : theme.fg("success", "\u2713");
   const s = renderStats(details, theme);
   let line = icon + (s ? " " + s : "");
   line += " " + theme.fg("dim", "\u00B7") + " " + theme.fg("dim", duration);

   if (expanded) {
      if (resultText) {
         const allLines = resultText.split("\n");
         const expandedLineLimit = "expandedLineLimit" in options ? (options.expandedLineLimit ?? null) : 50;
         const lines = expandedLineLimit === null ? allLines : allLines.slice(0, expandedLineLimit);
         for (const l of lines) {
            line += "\n" + theme.fg("dim", `  ${l}`);
         }
         const overflowHint = options.overflowHint === undefined ? DEFAULT_OVERFLOW_HINT : options.overflowHint;
         if (overflowHint && expandedLineLimit !== null && allLines.length > expandedLineLimit) {
            line += "\n" + theme.fg("muted", overflowHint);
         }
      }
   } else {
      const doneText = isSteered ? "Wrapped up (turn limit)" : "Done";
      line += "\n" + theme.fg("dim", `  \u23BF  ${doneText}`);
   }
   return line;
}

/** Render stopped status: dim stop icon + stats + "Stopped". */
export function renderStopped(details: AgentDetails, theme: Theme): string {
   const s = renderStats(details, theme);
   let line = theme.fg("dim", "\u25A0") + (s ? " " + s : "");
   line += "\n" + theme.fg("dim", "  \u23BF  Stopped");
   return line;
}

/** Render error or aborted status: error icon + stats + status message. */
export function renderFailed(details: AgentDetails, theme: Theme): string {
   const s = renderStats(details, theme);
   let line = theme.fg("error", "\u2717") + (s ? " " + s : "");

   if (details.status === "error") {
      line += "\n" + theme.fg("error", `  \u23BF  Error: ${details.error ?? "unknown"}`);
   } else {
      line += "\n" + theme.fg("warning", "  \u23BF  Aborted (max turns exceeded)");
   }
   return line;
}

// ---- Shared helper ----

/**
 * Build the stats string: "haiku · thinking: high · ⟳5≤30 · 3 tool uses · 33.8k token".
 * Returns an empty string when all fields are absent or zero.
 */
export function renderStats(details: AgentDetails, theme: Theme): string {
   const parts: string[] = [];
   if (details.modelName) parts.push(details.modelName);
   if (details.tags) parts.push(...details.tags);
   if (details.turnCount != null && details.turnCount > 0) {
      parts.push(formatTurns(details.turnCount, details.maxTurns));
   }
   if (details.toolUses > 0) parts.push(`${details.toolUses} tool use${details.toolUses === 1 ? "" : "s"}`);
   if (details.tokens) parts.push(details.tokens);
   return parts.map((p) => theme.fg("dim", p)).join(" " + theme.fg("dim", "\u00B7") + " ");
}
