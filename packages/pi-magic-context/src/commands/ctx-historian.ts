import type { ExtensionAPI, ExtensionCommandContext, Theme } from "@earendil-works/pi-coding-agent";
import { type Component, matchesKey, type TUI, wrapTextWithAnsi } from "@earendil-works/pi-tui";
import { getCompartments, getSessionFacts } from "#core/features/magic-context/compartment-storage";
import type { ContextDatabase } from "#core/features/magic-context/storage";
import { getOrCreateSessionMeta } from "#core/features/magic-context/storage-meta";
import { resolveSessionId } from "./pi-command-utils";
import { readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const REFRESH_INTERVAL_MS = 1000;

export interface RegisterCtxHistorianDeps {
   db: ContextDatabase;
   isInFlight?: (sessionId: string) => boolean;
   historianModel?: string;
   historianFallbackModels?: readonly string[];
   historianTimeoutMs?: number;
   historianTwoPass?: boolean;
   historianThinkingLevel?: string;
}

export function registerCtxHistorianCommand(pi: ExtensionAPI, deps: RegisterCtxHistorianDeps): void {
   pi.registerCommand("ctx-historian", {
      description: "Show detailed historian status and recent activity",
      handler: async (_args, ctx) => {
         const sessionId = resolveSessionId(ctx);
         if (!sessionId) return;
         if (ctx.hasUI) {
            await showHistorianDialog(pi, ctx, deps, sessionId);
         }
      },
   });
}

async function showHistorianDialog(
   _pi: ExtensionAPI,
   ctx: ExtensionCommandContext,
   deps: RegisterCtxHistorianDeps,
   sessionId: string,
): Promise<void> {
   await ctx.ui.custom<undefined>(
      (tui, theme, _keybindings, done) =>
         new HistorianDialogComponent({
            db: deps.db,
            sessionId,
            isInFlight: deps.isInFlight,
            historianModel: deps.historianModel,
            historianFallbackModels: deps.historianFallbackModels,
            historianTimeoutMs: deps.historianTimeoutMs,
            historianTwoPass: deps.historianTwoPass,
            historianThinkingLevel: deps.historianThinkingLevel,
            sessionManager: ctx.sessionManager,
            theme,
            tui,
            done,
         }),
      {
         overlay: true,
         overlayOptions: { anchor: "center", width: "80%", minWidth: 72, maxHeight: "75%", margin: 1 },
      },
   );
}

interface HistorianDialogProps {
   db: ContextDatabase;
   sessionId: string;
   isInFlight?: (sessionId: string) => boolean;
   historianModel?: string;
   historianFallbackModels?: readonly string[];
   historianTimeoutMs?: number;
   historianTwoPass?: boolean;
   historianThinkingLevel?: string;
   sessionManager: ExtensionCommandContext["sessionManager"];
   theme: Theme;
   tui: TUI;
   done: (value: undefined) => void;
}

const SPINNER = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

class HistorianDialogComponent implements Component {
   private readonly props: HistorianDialogProps;
   private refreshTimer: ReturnType<typeof setInterval> | null = null;
   private scrollOffset = 0;
   private lastTotalLines = 0;
   private maxVisibleArea = 0;
   private spinnerIndex = 0;

   constructor(props: HistorianDialogProps) {
      this.props = props;
      this.refreshTimer = setInterval(() => {
         this.spinnerIndex = (this.spinnerIndex + 1) % SPINNER.length;
         this.props.tui.requestRender();
      }, REFRESH_INTERVAL_MS);
   }

   handleInput(data: string): void {
      if (matchesKey(data, "escape") || matchesKey(data, "ctrl+c") || matchesKey(data, "return")) {
         this.close();
         return;
      }
      if (matchesKey(data, "pageUp")) {
         this.scrollOffset = Math.max(0, this.scrollOffset - this.maxVisibleArea);
         this.props.tui.requestRender();
         return;
      }
      if (matchesKey(data, "pageDown")) {
         this.scrollOffset = Math.min(this.maxScroll(this.maxVisibleArea), this.scrollOffset + this.maxVisibleArea);
         this.props.tui.requestRender();
         return;
      }
      if (matchesKey(data, "home")) {
         this.scrollOffset = 0;
         this.props.tui.requestRender();
         return;
      }
      if (matchesKey(data, "end")) {
         this.scrollOffset = this.maxScroll(this.maxVisibleArea);
         this.props.tui.requestRender();
         return;
      }
   }

   invalidate(): void {}

   render(width: number): string[] {
      const allLines = this.buildLines();
      const innerWidth = Math.max(20, width - 4);
      const wrapped: string[] = [];
      for (const line of allLines) {
         const stripped = stripAnsi(line);
         if (stripped.length <= innerWidth) {
            wrapped.push(line);
         } else {
            const wrappedLines = wrapTextWithAnsi(line, innerWidth);
            for (const wl of wrappedLines) wrapped.push(wl);
         }
      }
      this.lastTotalLines = wrapped.length;
      // Clip to overlay height: 75% maxHeight - margin(1)*2 - border(2)
      const termHeight = process.stdout.rows ?? 30;
      this.maxVisibleArea = Math.max(5, Math.floor(termHeight * 0.75) - 4);
      const maxScroll = this.maxScroll(this.maxVisibleArea);
      this.scrollOffset = Math.min(this.scrollOffset, maxScroll);
      const visible = wrapped.slice(this.scrollOffset, this.scrollOffset + this.maxVisibleArea);
      return drawBorder(visible, width, this.props.theme, this.scrollOffset, maxScroll, this.lastTotalLines);
   }

   private buildLines(): string[] {
      const { db, sessionId, isInFlight, theme } = this.props;
      const meta = getOrCreateSessionMeta(db, sessionId);
      const metaRow = db
         .prepare<
            [string],
            {
               historian_failure_count: number | null;
               historian_last_error: string | null;
               historian_last_failure_at: number | null;
            }
         >(
            "SELECT historian_failure_count, historian_last_error, historian_last_failure_at FROM session_meta WHERE session_id = ?",
         )
         .get(sessionId);

      const failureCount = metaRow?.historian_failure_count ?? 0;
      const lastError = metaRow?.historian_last_error ?? null;
      const lastFailureAt =
         typeof metaRow?.historian_last_failure_at === "number" ? metaRow.historian_last_failure_at : null;
      const inFlightMem = isInFlight?.(sessionId) ?? false;
      const inFlightDb = meta.compartmentInProgress === true;
      const inFlight = inFlightMem || inFlightDb;
      const compartments = getCompartments(db, sessionId);
      const facts = getSessionFacts(db, sessionId);
      const lastCompartment = compartments[compartments.length - 1];
      const totalTokens = 0;

      const lines: string[] = [];

      // Header
      lines.push(theme.fg("accent", theme.bold("Historian Status")));
      lines.push("");

      // State
      if (inFlight) {
         const spinner = SPINNER[this.spinnerIndex] ?? SPINNER[0];
         lines.push(`State: ${theme.fg("warning", `${spinner} running`)}`);
         lines.push(`Compartment in progress: ${meta.compartmentInProgress ? "yes" : "no"}`);
      } else {
         lines.push(`State: ${theme.fg("muted", "idle")}`);
      }

      // Config
      lines.push("");
      lines.push(theme.fg("muted", "Config"));
      if (this.props.historianModel) {
         lines.push(`Model: ${this.props.historianModel}`);
      }
      if (this.props.historianTimeoutMs) {
         lines.push(`Timeout: ${Math.round(this.props.historianTimeoutMs / 1000)}s`);
      }
      if (this.props.historianTwoPass !== undefined) {
         lines.push(`Two-pass: ${this.props.historianTwoPass ? "on" : "off"}`);
      }
      if (this.props.historianThinkingLevel) {
         lines.push(`Thinking: ${this.props.historianThinkingLevel}`);
      }
      if (this.props.historianFallbackModels && this.props.historianFallbackModels.length > 0) {
         lines.push(`Fallbacks: ${this.props.historianFallbackModels.join(", ")}`);
      }

      // Stored data
      lines.push("");
      lines.push(theme.fg("muted", "Stored"));
      lines.push(`Historian compartments: ${compartments.length}`);
      const allEntries = this.props.sessionManager.getEntries();
      const sessionCompactions = allEntries.filter((e: { type: string }) => e.type === "compaction").length;
      if (sessionCompactions > 0) {
         lines.push(`Session compacted: ${sessionCompactions} time${sessionCompactions === 1 ? "" : "s"}`);
      }
      if (lastCompartment) {
         lines.push(`Last range: messages ${lastCompartment.startMessage}-${lastCompartment.endMessage}`);
      }
      lines.push(`Facts: ${facts.length}`);
      if (totalTokens > 0) {
         lines.push(`Total compartment tokens: ~${totalTokens.toLocaleString()}`);
      }

      // Failure info
      if (failureCount > 0) {
         lines.push("");
         lines.push(theme.fg("error", `Failures: ${failureCount}`));
         if (lastFailureAt) {
            lines.push(`Last failure: ${relTime(lastFailureAt)}`);
         }
         if (lastError) {
            const brief = lastError.length > 160 ? `${lastError.slice(0, 157)}...` : lastError;
            lines.push(theme.fg("error", `Error: ${brief}`));
         }
      }

      // Recent events
      const events = readRecentHistorianEvents(sessionId, 25);
      if (events.length > 0) {
         lines.push("");
         lines.push(theme.fg("muted", "Recent log:"));
         for (const event of events) {
            lines.push(theme.fg("muted", formatEventLine(event)));
         }
      }

      lines.push("");
      lines.push(theme.fg("muted", "Press Escape to close"));

      return lines;
   }

   private maxScroll(visibleHeight?: number): number {
      const vh = visibleHeight ?? this.lastTotalLines;
      return Math.max(0, this.lastTotalLines - vh);
   }

   private close(): void {
      this.clearTimer();
      this.props.done(undefined);
   }

   private clearTimer(): void {
      if (this.refreshTimer) {
         clearInterval(this.refreshTimer);
         this.refreshTimer = null;
      }
   }

   dispose(): void {
      this.clearTimer();
   }
}

function readRecentHistorianEvents(sessionId: string, maxLines: number = 12): string[] {
   try {
      const logPath = join(tmpdir(), "pi", "magic-context", "magic-context.log");
      if (!existsSync(logPath)) return [];
      const content = readFileSync(logPath, "utf-8");
      const lines = content.split("\n");
      const historianLines: string[] = [];
      for (let i = lines.length - 1; i >= 0 && historianLines.length < maxLines; i--) {
         const line = lines[i];
         if (line.includes(sessionId) && (line.includes("historian") || line.includes("compartment trigger"))) {
            historianLines.unshift(line);
         }
      }
      return historianLines;
   } catch {
      return [];
   }
}

function formatEventLine(line: string): string {
   const timestampMatch = line.match(/^\[([^\]]+)\]/);
   let time = "";
   if (timestampMatch) {
      try {
         const d = new Date(timestampMatch[1]);
         time = d.toLocaleTimeString(undefined, {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
         });
      } catch {
         time = timestampMatch[1].split("T")[1]?.split(".")[0] ?? "";
      }
   }
   const sessionPrefix = line.match(/\[magic-context\]\[[^\]]+\]\s*/);
   const rest = sessionPrefix ? line.slice(sessionPrefix[0].length + (timestampMatch?.[0]?.length ?? 0)) : line;
   const trimmed = rest.trim();
   return `${time}  ${trimmed}`;
}

function relTime(ts: number): string {
   const elapsed = Date.now() - ts;
   if (elapsed < 0) return "just now";
   if (elapsed < 60_000) return `${Math.floor(elapsed / 1000)}s ago`;
   if (elapsed < 3_600_000) return `${Math.floor(elapsed / 60_000)}m ago`;
   if (elapsed < 86_400_000) return `${Math.floor(elapsed / 3_600_000)}h ago`;
   return `${Math.floor(elapsed / 86_400_000)}d ago`;
}

function stripAnsi(str: string): string {
   // eslint-disable-next-line no-control-regex
   return str.replace(/\x1B\[[0-9;]*m/g, "");
}

function drawBorder(
   lines: string[],
   width: number,
   theme: Theme,
   scrollOffset?: number,
   maxScroll?: number,
   totalLines?: number,
): string[] {
   const borderColor = theme.fg("muted", "");
   const reset = "\x1b[0m";
   const result: string[] = [];
   const innerWidth = Math.max(20, width - 2);

   result.push(`${borderColor}╭${"─".repeat(innerWidth)}╮${reset}`);

   for (const line of lines) {
      const stripped = stripAnsi(line);
      const padding = Math.max(0, innerWidth - stripped.length);
      result.push(`${borderColor}│${reset} ${line}${" ".repeat(padding > 0 ? padding - 1 : 0)}${borderColor}│${reset}`);
   }

   // Scroll indicator
   if (scrollOffset !== undefined && maxScroll !== undefined && totalLines !== undefined && maxScroll > 0) {
      const pos = scrollOffset === 0 ? "top" : scrollOffset >= maxScroll ? "bot" : `${scrollOffset}/${maxScroll}`;
      const indicator = ` ↑↓ ${pos} `;
      const pad = Math.max(0, innerWidth - indicator.length);
      result.push(
         `${borderColor}╰${"─".repeat(Math.max(0, Math.floor(pad / 2)))}${reset}${theme.fg("muted", indicator)}${borderColor}${"─".repeat(Math.max(0, Math.ceil(pad / 2)))}╯${reset}`,
      );
   } else {
      result.push(`${borderColor}╰${"─".repeat(innerWidth)}╯${reset}`);
   }

   return result;
}
