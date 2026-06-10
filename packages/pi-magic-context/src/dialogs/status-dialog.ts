import type { ExtensionAPI, ExtensionCommandContext, Theme } from "@earendil-works/pi-coding-agent";
import {
   type Component,
   matchesKey,
   type TUI,
   truncateToWidth,
   visibleWidth,
   wrapTextWithAnsi,
} from "@earendil-works/pi-tui";
import { getCompartments, getSessionFacts } from "#core/features/magic-context/compartment-storage";
import { getDreamState } from "#core/features/magic-context/dreamer/storage-dream-state";
import { getMemoryCount } from "#core/features/magic-context/memory/storage-memory";
import type { ContextDatabase } from "#core/features/magic-context/storage";
import { getOrCreateSessionMeta } from "#core/features/magic-context/storage-meta";
import { getNotes } from "#core/features/magic-context/storage-notes";
import { getTagsBySession } from "#core/features/magic-context/storage-tags";
import { resolveExecuteThresholdDetail } from "#core/hooks/magic-context/event-resolvers";
import { formatBytes } from "#core/hooks/magic-context/format-bytes";
import { estimateTokens } from "#core/hooks/magic-context/read-session-formatting";
import { formatThresholdPercent } from "#core/shared/format-threshold";
import { log, sessionLog } from "#core/shared/logger";
import packageJson from "../../package.json";
import { resolveSessionId } from "../commands/pi-command-utils";
import type { StatusDemoController } from "../demo/status-demo";

const COLORS = {
   system: "#c084fc",
   compartments: "#60a5fa",
   facts: "#fbbf24",
   memories: "#34d399",
   conversation: "#f87171",
   toolCalls: "#fb923c",
   toolDefs: "#f472b6",
};

/** Refresh cadence while dialog is open. */
const REFRESH_INTERVAL_MS = 1000;
const STATUS_DIALOG_PROFILE = process.env.PI_MAGIC_CONTEXT_PROFILE_STATUS === "1";

function profileStatusDialog(sessionId: string, message: string): void {
   if (!STATUS_DIALOG_PROFILE) return;
   sessionLog(sessionId, message);
}

export interface StatusDialogDeps {
   db: ContextDatabase;
   projectIdentity: string;
   protectedTags?: number;
   nudgeIntervalTokens?: number;
   executeThresholdPercentage?: number | { default: number; [modelKey: string]: number };
   historyBudgetPercentage?: number;
   executeThresholdTokens?: {
      default?: number;
      [modelKey: string]: number | undefined;
   };
   dreamer?: { runnable?: boolean; schedule?: string };
}

export interface StatusDialogDetail {
   sessionId: string;
   usagePercentage: number;
   inputTokens: number;
   systemPromptTokens: number;
   compartmentCount: number;
   factCount: number;
   memoryCount: number;
   memoryBlockCount: number;
   sessionNoteCount: number;
   readySmartNoteCount: number;
   pendingOpsCount: number;
   historianRunning: boolean;
   historianFailureCount: number;
   historianLastFailureAt: number | null;
   historianLastError: string | null;
   dreamerEnabled: boolean;
   dreamerSchedule: string | null;
   dreamerLastRunAt: number | null;
   cacheTtl: string;
   lastResponseTime: number;
   cacheRemainingMs: number;
   cacheExpired: boolean;
   lastNudgeTokens: number;
   lastNudgeBand: string;
   lastTransformError: string | null;
   issueLines: string[];
   isSubagent: boolean;
   contextLimit: number;
   executeThreshold: number;
   protectedTagCount: number;
   nudgeInterval: number;
   nextNudgeAfter: number;
   historyBlockTokens: number;
   compressionBudget: number | null;
   compressionUsage: string | null;
   activeTags: number;
   droppedTags: number;
   totalTags: number;
   activeBytes: number;
   compartmentTokens: number;
   factTokens: number;
   memoryTokens: number;
   conversationTokens: number;
   toolCallTokens: number;
   toolDefinitionTokens: number;
}

export async function showStatusDialog(
   pi: ExtensionAPI,
   ctx: ExtensionCommandContext,
   deps: StatusDialogDeps,
): Promise<void> {
   const sessionId = resolveSessionId(ctx);
   if (!sessionId) throw new Error("No active Pi session is available.");

   const showStart = performance.now();
   profileStatusDialog(sessionId, "status-dialog: showStatusDialog before ctx.ui.custom");
   await ctx.ui.custom<undefined>(
      (tui, theme, _keybindings, done) => {
         profileStatusDialog(
            sessionId,
            `status-dialog: factory invoked after ${(performance.now() - showStart).toFixed(0)}ms`,
         );
         return new StatusDialogComponent({
            pi,
            ctx,
            deps,
            sessionId,
            theme,
            tui,
            done,
         });
      },
      {
         overlay: true,
         overlayOptions: { anchor: "center", width: "88%", minWidth: 78, margin: 1 },
      },
   );
   profileStatusDialog(
      sessionId,
      `status-dialog: ctx.ui.custom resolved after ${(performance.now() - showStart).toFixed(0)}ms`,
   );
}

export async function showDemoStatusDialog(
   ctx: ExtensionCommandContext,
   controller: StatusDemoController,
   emitLogs: (lines: string[]) => void = (lines) => lines.forEach((line) => log(line)),
): Promise<void> {
   await ctx.ui.custom<undefined>(
      (tui, theme, _keybindings, done) => new DemoStatusDialogComponent({ controller, theme, tui, done, emitLogs }),
      {
         overlay: true,
         overlayOptions: { anchor: "center", width: "88%", minWidth: 78, margin: 1 },
      },
   );
}

interface DemoStatusDialogProps {
   controller: StatusDemoController;
   theme: Theme;
   tui: TUI;
   done: (value: undefined) => void;
   emitLogs: (lines: string[]) => void;
}

class DemoStatusDialogComponent implements Component {
   private readonly props: DemoStatusDialogProps;
   private refreshTimer: ReturnType<typeof setInterval> | null = null;

   constructor(props: DemoStatusDialogProps) {
      this.props = props;
      this.props.emitLogs(this.props.controller.current().logs);
      this.refreshTimer = setInterval(() => this.props.tui.requestRender(), REFRESH_INTERVAL_MS);
   }

   handleInput(data: string): void {
      const lower = data.toLowerCase();
      if (matchesKey(data, "escape") || matchesKey(data, "ctrl+c") || matchesKey(data, "return")) {
         this.close();
         return;
      }
      if (lower === "n" || data === "\u001b[C") {
         this.props.emitLogs(this.props.controller.next().logs);
         this.props.tui.requestRender();
         return;
      }
      if (lower === "p" || data === "\u001b[D") {
         this.props.emitLogs(this.props.controller.previous().logs);
         this.props.tui.requestRender();
         return;
      }
      if (lower === "r") {
         this.props.emitLogs(this.props.controller.reset().logs);
         this.props.tui.requestRender();
         return;
      }
      if (lower === "l") {
         this.props.emitLogs(this.props.controller.current().logs);
      }
   }

   invalidate(): void {
      // stateless render; nothing to invalidate
   }

   render(width: number): string[] {
      const snapshot = this.props.controller.current();
      const innerWidth = Math.max(20, width - 4);
      const inner = wrapStatusLines(
         renderDemoInner(snapshot.banner, snapshot.detail, this.props.theme, innerWidth),
         innerWidth,
      );
      return drawBorder(inner, width, this.props.theme);
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

interface StatusDialogProps {
   pi: ExtensionAPI;
   ctx: ExtensionCommandContext;
   deps: StatusDialogDeps;
   sessionId: string;
   theme: Theme;
   tui: TUI;
   done: (value: undefined) => void;
}

/**
 * Custom Component implementation:
 *  - implements its own handleInput so Escape / Enter / Ctrl+C close cleanly
 *  - draws a Unicode rounded-corner border using theme borderMuted color
 *  - rebuilds detail and re-renders on a 1s timer so live values stay current
 *  - cleans up timer on close
 */
class StatusDialogComponent implements Component {
   private readonly props: StatusDialogProps;
   private detail: StatusDialogDetail;
   private refreshTimer: ReturnType<typeof setInterval> | null = null;
   private initialRefreshTimer: ReturnType<typeof setTimeout> | null = null;
   private initialRefreshQueued = false;
   private closed = false;

   constructor(props: StatusDialogProps) {
      const constructorStart = performance.now();
      this.props = props;
      profileStatusDialog(props.sessionId, "status-dialog: component constructor start");
      this.detail = buildCachedPiStatusDetail(props.ctx, props.deps, props.sessionId);
      profileStatusDialog(
         props.sessionId,
         `status-dialog: component constructor cached detail ready after ${(performance.now() - constructorStart).toFixed(0)}ms`,
      );
      this.refreshTimer = setInterval(() => {
         this.refreshDetail("interval");
      }, REFRESH_INTERVAL_MS);
      profileStatusDialog(
         props.sessionId,
         `status-dialog: component constructor done after ${(performance.now() - constructorStart).toFixed(0)}ms`,
      );
   }

   handleInput(data: string): void {
      if (matchesKey(data, "escape") || matchesKey(data, "ctrl+c") || matchesKey(data, "return")) {
         profileStatusDialog(this.props.sessionId, "status-dialog: close input received");
         this.close();
      }
   }

   private close(): void {
      if (this.closed) return;
      const closeStart = performance.now();
      this.closed = true;
      this.clearTimers();
      this.props.done(undefined);
      profileStatusDialog(
         this.props.sessionId,
         `status-dialog: close completed after ${(performance.now() - closeStart).toFixed(0)}ms`,
      );
   }

   invalidate(): void {
      // stateless render; nothing to invalidate
   }

   render(width: number): string[] {
      const renderStart = performance.now();
      const innerWidth = Math.max(20, width - 4);
      const inner = wrapStatusLines(renderInner(this.detail, this.props.theme, innerWidth), innerWidth);
      const lines = drawBorder(inner, width, this.props.theme);
      this.scheduleInitialRefresh();
      profileStatusDialog(
         this.props.sessionId,
         `status-dialog: render(${width}) completed after ${(performance.now() - renderStart).toFixed(0)}ms (${lines.length} lines)`,
      );
      return lines;
   }

   dispose(): void {
      this.clearTimers();
   }

   private scheduleInitialRefresh(): void {
      if (this.closed || this.initialRefreshQueued) return;
      this.initialRefreshQueued = true;
      this.initialRefreshTimer = setTimeout(() => {
         this.initialRefreshTimer = null;
         this.refreshDetail("initial");
      }, 0);
   }

   private refreshDetail(reason: "initial" | "interval"): void {
      if (this.closed) return;
      const refreshStart = performance.now();
      try {
         this.detail = buildPiStatusDetail(this.props.pi, this.props.ctx, this.props.deps, this.props.sessionId);
         this.props.tui.requestRender();
         profileStatusDialog(
            this.props.sessionId,
            `status-dialog: ${reason} refresh completed after ${(performance.now() - refreshStart).toFixed(0)}ms`,
         );
      } catch {
         // best effort; keep previous detail
      }
   }

   private clearTimers(): void {
      if (this.initialRefreshTimer) {
         clearTimeout(this.initialRefreshTimer);
         this.initialRefreshTimer = null;
      }
      if (this.refreshTimer) {
         clearInterval(this.refreshTimer);
         this.refreshTimer = null;
      }
   }
}

function renderDemoInner(banner: string, detail: StatusDialogDetail, theme: Theme, innerWidth: number): string[] {
   const lines = [
      theme.fg("warning", theme.bold(banner)),
      theme.fg("muted", "Fixture-only. No database opened. No real state changed."),
      "",
      ...renderInner(detail, theme, innerWidth),
   ];
   lines[lines.length - 1] = theme.fg("muted", "N next · P previous · R reset · L log · Escape close");
   return lines;
}

function renderInner(s: StatusDialogDetail, theme: Theme, innerWidth: number): string[] {
   const pctColor = s.usagePercentage >= 80 ? "error" : s.usagePercentage >= 65 ? "warning" : "accent";
   const lines: string[] = [];

   // Header
   lines.push(
      `${theme.fg("accent", theme.bold("⚡ Magic Context Status"))}   ${theme.fg("muted", `v${packageJson.version}`)}`,
   );
   lines.push("");

   // Context summary
   lines.push(
      `Context  ${theme.fg(pctColor, theme.bold(`${s.usagePercentage.toFixed(1)}%`))} · ${fmt(s.inputTokens)} / ${
         s.contextLimit > 0 ? fmt(s.contextLimit) : "?"
      } tokens`,
   );

   // Segmented bar (fills the full inner content width)
   lines.push(renderBar(s, innerWidth));

   // Legend
   for (const seg of breakdownSegments(s)) {
      const pct = ((seg.tokens / (s.inputTokens || 1)) * 100).toFixed(1);
      const left = colorHex(seg.color, `${seg.label}${seg.detail ? ` ${seg.detail}` : ""}`);
      const right = theme.fg("muted", `${fmt(seg.tokens)} (${pct}%)`);
      lines.push(`${left}   ${right}`);
   }
   lines.push("");

   // Quick counts + historian
   lines.push(
      `Counts: ${s.compartmentCount} compartments · ${s.factCount} facts · ${s.memoryCount} memories (${s.memoryBlockCount} injected) · ${
         s.sessionNoteCount + s.readySmartNoteCount
      } notes`,
   );
   lines.push(
      `Historian: ${s.historianRunning ? theme.fg("warning", "running") : theme.fg("accent", "idle")}${
         s.historianFailureCount > 0
            ? ` · ${theme.fg("error", `last failure ${s.historianLastFailureAt ? relTime(s.historianLastFailureAt) : "unknown"}`)}`
            : ""
      }`,
   );
   const dreamerLine = renderDreamerLine(s, theme);
   if (dreamerLine) lines.push(dreamerLine);
   lines.push(`Pending drops: ${s.pendingOpsCount}`);
   lines.push(
      `Cache TTL: ${s.cacheTtl} · last response ${
         s.lastResponseTime > 0 ? `${Math.round((Date.now() - s.lastResponseTime) / 1000)}s ago` : "never"
      } · ${s.cacheExpired ? theme.fg("warning", "expired") : `${Math.round(s.cacheRemainingMs / 1000)}s remaining`}`,
   );
   for (const issue of s.issueLines) lines.push(theme.fg("warning", `⚠ ${issue}`));
   lines.push("");

   // Tags
   lines.push(theme.fg("muted", "Tags"));
   lines.push(
      `Active ${s.activeTags} (~${formatBytes(s.activeBytes)}) · Dropped ${s.droppedTags} · Total ${s.totalTags}`,
   );

   // Rolling nudges / context
   lines.push(theme.fg("muted", "Rolling Nudges / Context"));
   lines.push(
      `Execute threshold ${formatThresholdPercent(s.executeThreshold)}% · Anchor ${fmt(s.lastNudgeTokens)} tok · Interval ${fmt(s.nudgeInterval)} tok · Next ${fmt(s.nextNudgeAfter)} tok`,
   );
   lines.push(
      `Protected tags ${s.protectedTagCount} · Subagent ${s.isSubagent ? "yes" : "no"} · History block ~${fmt(s.historyBlockTokens)} tok${
         s.compressionBudget ? ` · Budget ~${fmt(s.compressionBudget)} tok (${s.compressionUsage} used)` : ""
      }`,
   );

   if (s.lastTransformError) lines.push(theme.fg("error", `⚠ ${s.lastTransformError}`));
   if (s.historianLastError) lines.push(theme.fg("error", `⚠ ${s.historianLastError}`));

   lines.push("");
   lines.push(theme.fg("muted", "Press Escape to close"));
   return lines;
}

function wrapStatusLines(lines: string[], innerWidth: number): string[] {
   return lines.flatMap((line) => {
      if (line.length === 0) return [""];
      return wrapTextWithAnsi(line, innerWidth);
   });
}

/**
 * Wrap inner lines with a visible Unicode rounded-corner border.
 */
function drawBorder(inner: string[], width: number, theme: Theme): string[] {
   const innerWidth = Math.max(20, width - 4); // 2 chars border + 1 padding each side
   const border = (s: string) => theme.fg("accent", s);

   const top = border(`╭${"─".repeat(innerWidth + 2)}╮`);
   const bottom = border(`╰${"─".repeat(innerWidth + 2)}╯`);
   const side = border("│");

   const out: string[] = [];
   out.push(top);
   for (const raw of inner) {
      const line = truncateToWidth(raw, innerWidth, "");
      const visible = visibleWidth(line);
      const pad = " ".repeat(Math.max(0, innerWidth - visible));
      out.push(`${side} ${line}${pad} ${side}`);
   }
   out.push(bottom);
   return out;
}

function buildCachedPiStatusDetail(
   ctx: ExtensionCommandContext,
   deps: StatusDialogDeps,
   sessionId: string,
): StatusDialogDetail {
   const usage = ctx.getContextUsage?.();
   const meta = getOrCreateSessionMeta(deps.db, sessionId);
   const metaRow = readSessionMetaRow(deps.db, sessionId);
   const inputTokens = typeof usage?.tokens === "number" ? usage.tokens : meta.lastInputTokens;
   const usagePercentage = typeof usage?.percent === "number" ? usage.percent : meta.lastContextPercentage;
   const contextLimit =
      typeof usage?.contextWindow === "number" && usage.contextWindow > 0
         ? usage.contextWindow
         : usagePercentage > 0
           ? Math.round(inputTokens / (usagePercentage / 100))
           : 0;
   const modelKey = ctx.model ? `${ctx.model.provider}/${ctx.model.id}` : undefined;
   const threshold = resolveExecuteThresholdDetail(deps.executeThresholdPercentage ?? 65, modelKey, 65, {
      tokensConfig: deps.executeThresholdTokens,
      contextLimit: contextLimit || undefined,
      sessionId,
   });
   const cacheTtl = meta.cacheTtl || "5m";
   const cacheTtlMs = parseTtlString(cacheTtl);
   const elapsed = meta.lastResponseTime > 0 ? Date.now() - meta.lastResponseTime : 0;
   const cacheRemainingMs = meta.lastResponseTime > 0 ? Math.max(0, cacheTtlMs - elapsed) : cacheTtlMs;
   const cacheExpired = meta.lastResponseTime > 0 && cacheRemainingMs === 0;
   const nudgeInterval = deps.nudgeIntervalTokens ?? 20_000;
   const historyBudgetPercentage = deps.historyBudgetPercentage ?? 0.15;
   const compressionBudget =
      contextLimit > 0
         ? Math.floor(contextLimit * (Math.min(threshold.percentage, 80) / 100) * historyBudgetPercentage)
         : null;
   const conversationTokens = Math.max(0, inputTokens - meta.systemPromptTokens - meta.toolCallTokens);

   return {
      sessionId,
      usagePercentage,
      inputTokens,
      systemPromptTokens: meta.systemPromptTokens,
      compartmentCount: 0,
      factCount: 0,
      memoryCount: 0,
      memoryBlockCount: Number(metaRow?.memory_block_count ?? 0),
      sessionNoteCount: 0,
      readySmartNoteCount: 0,
      pendingOpsCount: 0,
      historianRunning: meta.compartmentInProgress,
      historianFailureCount: Number(metaRow?.historian_failure_count ?? 0),
      historianLastFailureAt:
         typeof metaRow?.historian_last_failure_at === "number" ? metaRow.historian_last_failure_at : null,
      historianLastError: metaRow?.historian_last_error ?? null,
      dreamerEnabled: deps.dreamer?.runnable === true,
      dreamerSchedule: deps.dreamer?.schedule?.trim() || null,
      dreamerLastRunAt: readDreamerLastRunAt(deps.db, deps.projectIdentity),
      cacheTtl,
      lastResponseTime: meta.lastResponseTime,
      cacheRemainingMs,
      cacheExpired,
      lastNudgeTokens: meta.lastNudgeTokens,
      lastNudgeBand: meta.lastNudgeBand ?? "",
      lastTransformError: meta.lastTransformError,
      issueLines: [],
      isSubagent: meta.isSubagent,
      contextLimit,
      executeThreshold: threshold.percentage,
      protectedTagCount: deps.protectedTags ?? 20,
      nudgeInterval,
      nextNudgeAfter: meta.lastNudgeTokens + nudgeInterval,
      historyBlockTokens: 0,
      compressionBudget,
      compressionUsage: null,
      activeTags: 0,
      droppedTags: 0,
      totalTags: 0,
      activeBytes: 0,
      compartmentTokens: 0,
      factTokens: 0,
      memoryTokens: 0,
      conversationTokens,
      toolCallTokens: meta.toolCallTokens,
      toolDefinitionTokens: 0,
   };
}

export function buildPiStatusDetail(
   pi: ExtensionAPI,
   ctx: ExtensionCommandContext,
   deps: StatusDialogDeps,
   sessionId: string,
): StatusDialogDetail {
   const perfStart = performance.now();
   const usage = ctx.getContextUsage?.();
   const meta = getOrCreateSessionMeta(deps.db, sessionId);
   const inputTokens = typeof usage?.tokens === "number" ? usage.tokens : meta.lastInputTokens;
   const usagePercentage = typeof usage?.percent === "number" ? usage.percent : meta.lastContextPercentage;
   const contextLimit =
      typeof usage?.contextWindow === "number" && usage.contextWindow > 0
         ? usage.contextWindow
         : usagePercentage > 0
           ? Math.round(inputTokens / (usagePercentage / 100))
           : 0;

   let compartmentTokens = 0;
   const compartments = getCompartments(deps.db, sessionId);
   for (const c of compartments) {
      compartmentTokens += estimateTokens(
         `<compartment start="${c.startMessage}" end="${c.endMessage}" title="${c.title}">\n${c.content}\n</compartment>\n`,
      );
   }
   let factTokens = 0;
   const facts = getSessionFacts(deps.db, sessionId);
   for (const f of facts) factTokens += estimateTokens(`* ${f.content}\n`);

   const metaRow = readSessionMetaRow(deps.db, sessionId);
   const memoryCache = metaRow?.memory_block_cache;
   const memoryTokens = typeof memoryCache === "string" && memoryCache.length > 0 ? estimateTokens(memoryCache) : 0;
   const memoryBlockCount = Number(metaRow?.memory_block_count ?? 0);

   // On Pi we don't persist system_prompt_tokens (no
   // experimental.chat.system.transform hook). Compute it on demand from
   // ctx.getSystemPrompt() when available; fall back to the stored value
   // so the dialog still has a sensible number outside command context.
   let systemPromptTokens = meta.systemPromptTokens;
   const perfSysPromptStart = performance.now();
   try {
      const sysPrompt = typeof ctx.getSystemPrompt === "function" ? ctx.getSystemPrompt() : undefined;
      if (typeof sysPrompt === "string" && sysPrompt.length > 0) {
         systemPromptTokens = estimateTokens(sysPrompt);
      }
      profileStatusDialog(
         sessionId,
         `status-dialog: getSystemPrompt took ${(performance.now() - perfSysPromptStart).toFixed(0)}ms (${typeof sysPrompt === "string" ? sysPrompt.length : 0} chars, ${systemPromptTokens} tokens)`,
      );
   } catch {
      // best effort; fall back to stored
   }

   const tags = getTagsBySession(deps.db, sessionId);
   const activeTags = tags.filter((tag) => tag.status === "active");
   const droppedTags = tags.filter((tag) => tag.status === "dropped");
   const activeBytes = activeTags.reduce((sum, tag) => sum + tag.byteSize, 0);
   const pendingOps = readPendingOpsCount(deps.db, sessionId);

   // Tool call + conversation tokens: read from session_meta where the
   // pipeline persists post-tag/post-injection/post-strip totals each
   // pass (see context-handler.ts:1858-1872 → tokenize-pi-messages.ts).
   //
   // IMPORTANT: do NOT walk `ctx.sessionManager.getBranch()` here.
   // `getBranch()` returns the full leaf-to-root path INCLUDING
   // pre-compaction-marker entries that were never tagged because they
   // predate the marker. Tokenizing all of them and trying to subtract
   // "dropped tool tags" cannot work — there are no tags for the
   // pre-compaction tool calls at all, so the result over-counts by
   // the entire pre-marker tool history (we observed Tool Calls = 1.1M
   // on a 162K context — ~650% impossible). The pipeline-side walk
   // uses the post-compaction `event.messages` view, which is the
   // authoritative source for what the LLM receives.
   const toolCallTokens = meta.toolCallTokens;

   // Tool definition tokens: serialize each registered tool the way Pi sends
   // them to providers — name + description + JSON-stringified parameter
   // schema. This is a structural estimate (not the exact wire payload), but
   // matches Host's calibrated bucket within a reasonable margin.
   let toolDefinitionTokens = 0;
   const perfToolsStart = performance.now();
   try {
      const tools = pi.getAllTools?.() ?? [];
      for (const tool of tools) {
         toolDefinitionTokens += estimateTokens(
            `${tool.name ?? ""}\n${tool.description ?? ""}\n${safeStringify(tool.parameters)}`,
         );
      }
      profileStatusDialog(
         sessionId,
         `status-dialog: getAllTools took ${(performance.now() - perfToolsStart).toFixed(0)}ms (${tools.length} tools, ${toolDefinitionTokens} tokens)`,
      );
   } catch {
      // best effort
   }

   const conversationTokens = Math.max(
      0,
      inputTokens -
         systemPromptTokens -
         compartmentTokens -
         factTokens -
         memoryTokens -
         toolCallTokens -
         toolDefinitionTokens,
   );

   const modelKey = ctx.model ? `${ctx.model.provider}/${ctx.model.id}` : undefined;
   const threshold = resolveExecuteThresholdDetail(deps.executeThresholdPercentage ?? 65, modelKey, 65, {
      tokensConfig: deps.executeThresholdTokens,
      contextLimit: contextLimit || undefined,
      sessionId,
   });
   const cacheTtl = meta.cacheTtl || "5m";
   const cacheTtlMs = parseTtlString(cacheTtl);
   const elapsed = meta.lastResponseTime > 0 ? Date.now() - meta.lastResponseTime : 0;
   const cacheRemainingMs = meta.lastResponseTime > 0 ? Math.max(0, cacheTtlMs - elapsed) : cacheTtlMs;
   const cacheExpired = meta.lastResponseTime > 0 && cacheRemainingMs === 0;
   const historyBlockTokens = compartmentTokens + factTokens;
   const historyBudgetPercentage = deps.historyBudgetPercentage ?? 0.15;
   const compressionBudget =
      contextLimit > 0
         ? Math.floor(contextLimit * (Math.min(threshold.percentage, 80) / 100) * historyBudgetPercentage)
         : null;

   profileStatusDialog(
      sessionId,
      `status-dialog: buildPiStatusDetail total ${(performance.now() - perfStart).toFixed(0)}ms`,
   );

   return {
      sessionId,
      usagePercentage,
      inputTokens,
      systemPromptTokens,
      compartmentCount: compartments.length,
      factCount: facts.length,
      memoryCount: safeRead(() => getMemoryCount(deps.db, deps.projectIdentity), 0),
      memoryBlockCount,
      sessionNoteCount: safeRead(
         () =>
            getNotes(deps.db, {
               sessionId,
               type: "session",
               status: "active",
            }).length,
         0,
      ),
      readySmartNoteCount: safeRead(
         () =>
            getNotes(deps.db, {
               projectPath: deps.projectIdentity,
               type: "smart",
               status: "ready",
            }).length,
         0,
      ),
      pendingOpsCount: pendingOps,
      historianRunning: meta.compartmentInProgress,
      historianFailureCount: Number(metaRow?.historian_failure_count ?? 0),
      historianLastFailureAt:
         typeof metaRow?.historian_last_failure_at === "number" ? metaRow.historian_last_failure_at : null,
      historianLastError: metaRow?.historian_last_error ?? null,
      dreamerEnabled: deps.dreamer?.runnable === true,
      dreamerSchedule: deps.dreamer?.schedule?.trim() || null,
      dreamerLastRunAt: readDreamerLastRunAt(deps.db, deps.projectIdentity),
      cacheTtl,
      lastResponseTime: meta.lastResponseTime,
      cacheRemainingMs,
      cacheExpired,
      lastNudgeTokens: meta.lastNudgeTokens,
      lastNudgeBand: meta.lastNudgeBand ?? "",
      lastTransformError: meta.lastTransformError,
      issueLines: [],
      isSubagent: meta.isSubagent,
      contextLimit,
      executeThreshold: threshold.percentage,
      protectedTagCount: deps.protectedTags ?? 20,
      nudgeInterval: deps.nudgeIntervalTokens ?? 20_000,
      nextNudgeAfter: meta.lastNudgeTokens + (deps.nudgeIntervalTokens ?? 20_000),
      historyBlockTokens,
      compressionBudget,
      compressionUsage:
         compressionBudget && compressionBudget > 0
            ? `${((historyBlockTokens / compressionBudget) * 100).toFixed(0)}%`
            : null,
      activeTags: activeTags.length,
      droppedTags: droppedTags.length,
      totalTags: tags.length,
      activeBytes,
      compartmentTokens,
      factTokens,
      memoryTokens,
      conversationTokens,
      toolCallTokens,
      toolDefinitionTokens,
   };
}

function safeStringify(value: unknown): string {
   try {
      if (value === undefined || value === null) return "";
      return typeof value === "string" ? value : JSON.stringify(value);
   } catch {
      return "";
   }
}

function breakdownSegments(s: StatusDialogDetail): Array<{
   label: string;
   tokens: number;
   color: string;
   detail?: string;
}> {
   const segs: Array<{
      label: string;
      tokens: number;
      color: string;
      detail?: string;
   }> = [];
   if (s.systemPromptTokens > 0)
      segs.push({
         label: "System",
         tokens: s.systemPromptTokens,
         color: COLORS.system,
      });
   if (s.compartmentTokens > 0)
      segs.push({
         label: "Compartments",
         tokens: s.compartmentTokens,
         color: COLORS.compartments,
         detail: `(${s.compartmentCount})`,
      });
   if (s.factTokens > 0)
      segs.push({
         label: "Facts",
         tokens: s.factTokens,
         color: COLORS.facts,
         detail: `(${s.factCount})`,
      });
   if (s.memoryTokens > 0)
      segs.push({
         label: "Memories",
         tokens: s.memoryTokens,
         color: COLORS.memories,
         detail: `(${s.memoryBlockCount})`,
      });
   if (s.conversationTokens > 0)
      segs.push({
         label: "Conversation",
         tokens: s.conversationTokens,
         color: COLORS.conversation,
      });
   if (s.toolCallTokens > 0)
      segs.push({
         label: "Tool Calls",
         tokens: s.toolCallTokens,
         color: COLORS.toolCalls,
      });
   if (s.toolDefinitionTokens > 0)
      segs.push({
         label: "Tool Defs",
         tokens: s.toolDefinitionTokens,
         color: COLORS.toolDefs,
      });
   return segs;
}

function renderBar(s: StatusDialogDetail, innerWidth: number): string {
   // Fill the full inner content row. Clamp to a sensible minimum so
   // extremely narrow terminals still render a visible bar instead of
   // collapsing all segments to width 1.
   const barWidth = Math.max(20, innerWidth);
   const segs = breakdownSegments(s);
   if (segs.length === 0) return "";
   const widths = segs.map((seg) => Math.max(1, Math.round((seg.tokens / (s.inputTokens || 1)) * barWidth)));
   let sum = widths.reduce((a, b) => a + b, 0);
   while (sum > barWidth) {
      const maxIdx = widths.indexOf(Math.max(...widths));
      if ((widths[maxIdx] ?? 0) > 1) {
         widths[maxIdx] -= 1;
         sum--;
      } else break;
   }
   while (sum < barWidth) {
      const maxIdx = widths.indexOf(Math.max(...widths));
      widths[maxIdx] = (widths[maxIdx] ?? 0) + 1;
      sum++;
   }
   return segs.map((seg, i) => colorHex(seg.color, "█".repeat(widths[i] ?? 0))).join("");
}

function renderDreamerLine(s: StatusDialogDetail, theme: Theme): string | null {
   const shouldShow = s.dreamerEnabled || s.readySmartNoteCount > 0 || s.dreamerLastRunAt !== null;
   if (!shouldShow) return null;

   const state = s.dreamerEnabled ? (s.dreamerSchedule ? `scheduled ${s.dreamerSchedule}` : "manual-only") : "disabled";
   const parts = [`Dreamer: ${theme.fg(s.dreamerEnabled ? "accent" : "muted", state)}`];
   if (s.readySmartNoteCount > 0) parts.push(`${s.readySmartNoteCount} smart ready`);
   if (s.dreamerLastRunAt !== null) parts.push(`last ${relTime(s.dreamerLastRunAt)}`);
   return parts.join(" · ");
}

function readDreamerLastRunAt(db: ContextDatabase, projectIdentity: string): number | null {
   const value = getDreamState(db, `last_dream_at:${projectIdentity}`);
   if (!value) return null;
   const parsed = Number(value);
   return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function readSessionMetaRow(db: ContextDatabase, sessionId: string) {
   return db
      .prepare<
         [string],
         {
            memory_block_cache: string | null;
            memory_block_count: number | null;
            historian_failure_count: number | null;
            historian_last_failure_at: number | null;
            historian_last_error: string | null;
         }
      >(
         "SELECT memory_block_cache, memory_block_count, historian_failure_count, historian_last_failure_at, historian_last_error FROM session_meta WHERE session_id = ?",
      )
      .get(sessionId);
}

function readPendingOpsCount(db: ContextDatabase, sessionId: string): number {
   try {
      const row = db
         .prepare<[string], { count: number }>("SELECT COUNT(*) as count FROM pending_ops WHERE session_id = ?")
         .get(sessionId);
      return row?.count ?? 0;
   } catch {
      return 0;
   }
}

function parseTtlString(ttl: string): number {
   const match = ttl.match(/^(\d+)(s|m|h)$/);
   if (!match) return 5 * 60 * 1000;
   const val = Number.parseInt(match[1] ?? "5", 10);
   switch (match[2]) {
      case "s":
         return val * 1000;
      case "m":
         return val * 60 * 1000;
      case "h":
         return val * 3600 * 1000;
      default:
         return 5 * 60 * 1000;
   }
}

function safeRead<T>(fn: () => T, fallback: T): T {
   try {
      return fn();
   } catch {
      return fallback;
   }
}

function fmt(n: number): string {
   const abs = Math.abs(n);
   if (abs >= 1_000_000) return `${trim1(n / 1_000_000)}M`;
   if (abs >= 1_000) return `${trim1(n / 1_000)}K`;
   return String(Math.round(n));
}

function trim1(n: number): string {
   const rounded = n.toFixed(1);
   return rounded.endsWith(".0") ? rounded.slice(0, -2) : rounded;
}

function colorHex(hex: string, text: string): string {
   const clean = hex.replace("#", "");
   const r = Number.parseInt(clean.slice(0, 2), 16);
   const g = Number.parseInt(clean.slice(2, 4), 16);
   const b = Number.parseInt(clean.slice(4, 6), 16);
   return `\x1b[38;2;${r};${g};${b}m${text}\x1b[39m`;
}

function relTime(ts: number): string {
   const seconds = Math.max(0, Math.round((Date.now() - ts) / 1000));
   if (seconds < 60) return `${seconds}s ago`;
   const minutes = Math.round(seconds / 60);
   if (minutes < 60) return `${minutes}m ago`;
   const hours = Math.round(minutes / 60);
   return `${hours}h ago`;
}
