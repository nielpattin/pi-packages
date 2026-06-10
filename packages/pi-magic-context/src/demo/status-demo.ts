import type { StatusDialogDetail } from "../dialogs/status-dialog";

export interface StatusDemoEnv {
   enabled: boolean;
}

export interface StatusDemoStep {
   id: string;
   title: string;
   detail: StatusDialogDetail;
   logs: string[];
   cache?: StatusDemoCacheScenario;
}

export interface StatusDemoSnapshot {
   index: number;
   stepNumber: number;
   totalSteps: number;
   step: StatusDemoStep;
   detail: StatusDialogDetail;
   banner: string;
   logs: string[];
}

export interface StatusDemoCacheScenario {
   ttlMs?: number;
   initialResponseAgeMs?: number;
}

export interface StatusDemoController {
   current(): StatusDemoSnapshot;
   next(): StatusDemoSnapshot;
   previous(): StatusDemoSnapshot;
   reset(): StatusDemoSnapshot;
   goToStep(stepNumber: number): StatusDemoSnapshot;
}

export interface CreateStatusDemoControllerOptions {
   initialStep?: number;
   now?: () => number;
}

const DEMO_NOW = Date.UTC(2026, 5, 4, 3, 0, 0);
const CONTEXT_LIMIT = 272_000;
const DEFAULT_CACHE_TTL_MS = 300_000;
const DEFAULT_RESPONSE_AGE_MS = 10_000;

function makeDetail(overrides: Partial<StatusDialogDetail>): StatusDialogDetail {
   const inputTokens = overrides.inputTokens ?? 18_000;
   const usagePercentage = overrides.usagePercentage ?? (inputTokens / CONTEXT_LIMIT) * 100;
   const systemPromptTokens = overrides.systemPromptTokens ?? 4_500;
   const compartmentTokens = overrides.compartmentTokens ?? 0;
   const factTokens = overrides.factTokens ?? 0;
   const memoryTokens = overrides.memoryTokens ?? 0;
   const toolCallTokens = overrides.toolCallTokens ?? 1_200;
   const toolDefinitionTokens = overrides.toolDefinitionTokens ?? 4_700;
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
   const executeThreshold = overrides.executeThreshold ?? 65;
   const historyBlockTokens = overrides.historyBlockTokens ?? compartmentTokens + factTokens;
   const compressionBudget =
      overrides.compressionBudget ?? Math.floor(CONTEXT_LIMIT * (Math.min(executeThreshold, 80) / 100) * 0.15);
   const compressionUsage =
      overrides.compressionUsage ??
      (compressionBudget > 0 ? `${Math.round((historyBlockTokens / compressionBudget) * 100)}%` : null);
   const lastNudgeTokens = overrides.lastNudgeTokens ?? 0;
   const nudgeInterval = overrides.nudgeInterval ?? 10_000;

   return {
      sessionId: "demo-session",
      usagePercentage,
      inputTokens,
      systemPromptTokens,
      compartmentCount: 0,
      factCount: 0,
      memoryCount: 0,
      memoryBlockCount: 0,
      sessionNoteCount: 0,
      readySmartNoteCount: 0,
      pendingOpsCount: 0,
      historianRunning: false,
      historianFailureCount: 0,
      historianLastFailureAt: null,
      historianLastError: null,
      dreamerEnabled: false,
      dreamerSchedule: null,
      dreamerLastRunAt: null,
      cacheTtl: "5m",
      lastResponseTime: DEMO_NOW - 10_000,
      cacheRemainingMs: 290_000,
      cacheExpired: false,
      lastNudgeTokens,
      lastNudgeBand: "none",
      lastTransformError: null,
      issueLines: [],
      isSubagent: false,
      contextLimit: CONTEXT_LIMIT,
      executeThreshold,
      protectedTagCount: 20,
      nudgeInterval,
      nextNudgeAfter: lastNudgeTokens + nudgeInterval,
      historyBlockTokens,
      compressionBudget,
      compressionUsage,
      activeTags: 0,
      droppedTags: 0,
      totalTags: 0,
      activeBytes: 0,
      compartmentTokens,
      factTokens,
      memoryTokens,
      conversationTokens,
      toolCallTokens,
      toolDefinitionTokens,
      ...overrides,
   };
}

function demoLogs(step: string, lines: string[]): string[] {
   return [
      `[magic-context-demo] ${step}`,
      "[magic-context-demo] fixture-only step, no database opened, no real state changed",
      ...lines.map((line) => `[magic-context-demo] ${line}`),
   ];
}

export const STATUS_DEMO_STEPS: readonly StatusDemoStep[] = [
   {
      id: "clean-startup",
      title: "Clean startup",
      detail: makeDetail({
         inputTokens: 18_000,
         usagePercentage: 6.6,
         activeTags: 12,
         totalTags: 12,
         activeBytes: 16_384,
      }),
      logs: demoLogs("step=1/8 clean-startup", ["fake startup state ready", "fake active_tags=12"]),
   },
   {
      id: "context-growing",
      title: "Context grows",
      detail: makeDetail({
         inputTokens: 84_000,
         usagePercentage: 30.9,
         activeTags: 284,
         totalTags: 284,
         activeBytes: 155_000,
         lastNudgeTokens: 72_000,
         toolCallTokens: 18_000,
      }),
      logs: demoLogs("step=2/8 context-growing", ["fake input_tokens=84000", "fake active_tags=284"]),
   },
   {
      id: "large-context-1m",
      title: "1M context window",
      detail: makeDetail({
         inputTokens: 450_000,
         usagePercentage: 45.0,
         activeTags: 2_400,
         totalTags: 2_400,
         activeBytes: 1_400_000,
         lastNudgeTokens: 320_000,
         toolCallTokens: 180_000,
         compartmentCount: 42,
         factCount: 14,
         memoryCount: 31,
         memoryBlockCount: 22,
         compartmentTokens: 28_000,
         factTokens: 2_600,
         memoryTokens: 4_200,
         contextLimit: 1_000_000,
         executeThreshold: 65,
         issueLines: ["Proactive Historian trigger capped at 272K = 27.2% instead of 63%"],
      }),
      logs: demoLogs("step=large-context-1m", [
         "fake context_limit=1000000",
         "fake execute_threshold=65% (650K)",
         "fake proactive_trigger=272K (27.2%)",
      ]),
   },
   {
      id: "pending-drops",
      title: "Pending drops queued",
      detail: makeDetail({
         inputTokens: 132_000,
         usagePercentage: 48.5,
         activeTags: 710,
         totalTags: 710,
         activeBytes: 410_000,
         pendingOpsCount: 12,
         lastNudgeTokens: 122_000,
         toolCallTokens: 52_000,
      }),
      logs: demoLogs("step=3/8 pending-drops", ["fake pending_ops=12", "fake ctx_reduce queued drops"]),
   },
   {
      id: "flush-applied",
      title: "Flush applied",
      detail: makeDetail({
         inputTokens: 96_000,
         usagePercentage: 35.3,
         activeTags: 420,
         droppedTags: 290,
         totalTags: 710,
         activeBytes: 250_000,
         pendingOpsCount: 0,
         lastNudgeTokens: 122_000,
         toolCallTokens: 24_000,
      }),
      logs: demoLogs("step=4/8 flush-applied", ["fake pending_ops 12 -> 0", "fake dropped_tags=290"]),
   },
   {
      id: "historian-running",
      title: "Historian running",
      detail: makeDetail({
         inputTokens: 150_000,
         usagePercentage: 55.1,
         activeTags: 820,
         droppedTags: 290,
         totalTags: 1_110,
         activeBytes: 612_000,
         historianRunning: true,
         lastNudgeTokens: 142_000,
         toolCallTokens: 70_000,
      }),
      logs: demoLogs("step=5/8 historian-running", ["fake historian state=running", "fake lease active"]),
   },
   {
      id: "compartments-written",
      title: "Compartments written",
      detail: makeDetail({
         inputTokens: 118_000,
         usagePercentage: 43.4,
         activeTags: 560,
         droppedTags: 550,
         totalTags: 1_110,
         activeBytes: 330_000,
         compartmentCount: 18,
         factCount: 6,
         memoryCount: 14,
         memoryBlockCount: 9,
         compartmentTokens: 4_800,
         factTokens: 520,
         memoryTokens: 1_600,
         historyBlockTokens: 5_320,
         toolCallTokens: 38_000,
      }),
      logs: demoLogs("step=6/8 compartments-written", ["fake compartments=18", "fake facts=6"]),
   },
   {
      id: "dreamer-scheduled",
      title: "Dreamer scheduled",
      detail: makeDetail({
         inputTokens: 121_000,
         usagePercentage: 44.5,
         activeTags: 575,
         droppedTags: 550,
         totalTags: 1_125,
         activeBytes: 348_000,
         compartmentCount: 18,
         factCount: 6,
         memoryCount: 23,
         memoryBlockCount: 15,
         sessionNoteCount: 2,
         readySmartNoteCount: 1,
         dreamerEnabled: true,
         dreamerSchedule: "02:00-06:00",
         compartmentTokens: 4_800,
         factTokens: 520,
         memoryTokens: 2_200,
         historyBlockTokens: 5_320,
         toolCallTokens: 40_000,
      }),
      logs: demoLogs("step=dreamer-scheduled", ["fake dreamer schedule=02:00-06:00", "fake ready_smart_notes=1"]),
   },
   {
      id: "config-recovered",
      title: "Config recovered",
      detail: makeDetail({
         inputTokens: 128_000,
         usagePercentage: 47.1,
         activeTags: 610,
         droppedTags: 550,
         totalTags: 1_160,
         activeBytes: 390_000,
         compartmentCount: 18,
         factCount: 6,
         memoryCount: 23,
         memoryBlockCount: 15,
         issueLines: ["Config warning: invalid field ignored, defaults kept"],
         compartmentTokens: 4_800,
         factTokens: 520,
         memoryTokens: 2_200,
         historyBlockTokens: 5_320,
         toolCallTokens: 44_000,
      }),
      logs: demoLogs("step=config-recovered", ["fake config schema recovery", "fake invalid top-level field ignored"]),
   },
   {
      id: "startup-storage-warning",
      title: "Startup storage warning",
      detail: makeDetail({
         inputTokens: 130_000,
         usagePercentage: 47.8,
         activeTags: 620,
         droppedTags: 550,
         totalTags: 1_170,
         activeBytes: 400_000,
         compartmentCount: 18,
         factCount: 6,
         memoryCount: 23,
         memoryBlockCount: 15,
         issueLines: ["Startup warning: deferred compaction marker rehydrate failed"],
         compartmentTokens: 4_800,
         factTokens: 520,
         memoryTokens: 2_200,
         historyBlockTokens: 5_320,
         toolCallTokens: 46_000,
      }),
      logs: demoLogs("step=startup-storage-warning", [
         "fake deferred Pi marker rehydrate failed",
         "fake extension continued",
      ]),
   },
   {
      id: "embedding-fallback",
      title: "Embedding fallback",
      detail: makeDetail({
         inputTokens: 132_000,
         usagePercentage: 48.5,
         activeTags: 635,
         droppedTags: 550,
         totalTags: 1_185,
         activeBytes: 410_000,
         compartmentCount: 18,
         factCount: 6,
         memoryCount: 23,
         memoryBlockCount: 15,
         issueLines: ["Embedding warning: semantic search unavailable, text search only"],
         compartmentTokens: 4_800,
         factTokens: 520,
         memoryTokens: 2_200,
         historyBlockTokens: 5_320,
         toolCallTokens: 48_000,
      }),
      logs: demoLogs("step=embedding-fallback", ["fake embedding runtime unavailable", "fake lexical fallback active"]),
   },
   {
      id: "auto-search-timeout",
      title: "Auto-search timeout",
      detail: makeDetail({
         inputTokens: 136_000,
         usagePercentage: 50.0,
         activeTags: 650,
         droppedTags: 550,
         totalTags: 1_200,
         activeBytes: 430_000,
         compartmentCount: 18,
         factCount: 6,
         memoryCount: 23,
         memoryBlockCount: 15,
         issueLines: ["Auto-search skipped: timeout, no hint injected this turn"],
         compartmentTokens: 4_800,
         factTokens: 520,
         memoryTokens: 2_200,
         historyBlockTokens: 5_320,
         toolCallTokens: 51_000,
      }),
      logs: demoLogs("step=auto-search-timeout", ["fake auto-search timeout", "fake no-hint reconciliation written"]),
   },
   {
      id: "historian-existing-invalid",
      title: "Historian state invalid",
      detail: makeDetail({
         inputTokens: 150_000,
         usagePercentage: 55.1,
         activeTags: 760,
         droppedTags: 590,
         totalTags: 1_350,
         activeBytes: 540_000,
         compartmentCount: 21,
         factCount: 7,
         memoryCount: 24,
         memoryBlockCount: 16,
         historianFailureCount: 1,
         historianLastFailureAt: DEMO_NOW - 90_000,
         historianLastError: "Demo historian skipped: existing stored compartments are invalid.",
         issueLines: ["Historian fail-closed: no new compartments written"],
         compartmentTokens: 7_200,
         factTokens: 700,
         memoryTokens: 2_800,
         historyBlockTokens: 7_900,
         toolCallTokens: 60_000,
      }),
      logs: demoLogs("step=historian-existing-invalid", [
         "fake stored compartment validation failed",
         "fake publish skipped",
      ]),
   },
   {
      id: "historian-chunk-unsafe",
      title: "Historian chunk unsafe",
      detail: makeDetail({
         inputTokens: 158_000,
         usagePercentage: 58.1,
         activeTags: 790,
         droppedTags: 610,
         totalTags: 1_400,
         activeBytes: 575_000,
         compartmentCount: 22,
         factCount: 7,
         memoryCount: 24,
         memoryBlockCount: 16,
         historianFailureCount: 1,
         historianLastFailureAt: DEMO_NOW - 110_000,
         historianLastError: "Demo historian skipped: raw chunk could not be represented safely.",
         issueLines: ["Chunk validation failed: durable state unchanged"],
         compartmentTokens: 7_900,
         factTokens: 760,
         memoryTokens: 2_900,
         historyBlockTokens: 8_660,
         toolCallTokens: 64_000,
      }),
      logs: demoLogs("step=historian-chunk-unsafe", [
         "fake chunk coverage validation failed",
         "fake no durable writes",
      ]),
   },
   {
      id: "historian-spawn-timeout",
      title: "Historian spawn timeout",
      detail: makeDetail({
         inputTokens: 168_000,
         usagePercentage: 61.8,
         activeTags: 825,
         droppedTags: 630,
         totalTags: 1_455,
         activeBytes: 620_000,
         compartmentCount: 23,
         factCount: 8,
         memoryCount: 25,
         memoryBlockCount: 17,
         historianFailureCount: 2,
         historianLastFailureAt: DEMO_NOW - 120_000,
         historianLastError: "Demo historian failed: subagent run timed out.",
         issueLines: ["Retry/fallback exhausted: user turn continued"],
         compartmentTokens: 8_600,
         factTokens: 800,
         memoryTokens: 3_000,
         historyBlockTokens: 9_400,
         toolCallTokens: 70_000,
      }),
      logs: demoLogs("step=historian-spawn-timeout", ["fake historian timeout", "fake failure recorded"]),
   },
   {
      id: "historian-editor-fallback",
      title: "Historian editor fallback",
      detail: makeDetail({
         inputTokens: 172_000,
         usagePercentage: 63.2,
         activeTags: 840,
         droppedTags: 640,
         totalTags: 1_480,
         activeBytes: 635_000,
         compartmentCount: 24,
         factCount: 8,
         memoryCount: 25,
         memoryBlockCount: 17,
         issueLines: ["Two-pass editor failed; accepted first valid draft"],
         compartmentTokens: 9_200,
         factTokens: 820,
         memoryTokens: 3_100,
         historyBlockTokens: 10_020,
         toolCallTokens: 72_000,
      }),
      logs: demoLogs("step=historian-editor-fallback", ["fake editor validation failed", "fake draft fallback kept"]),
   },
   {
      id: "compaction-marker-retry",
      title: "Compaction marker retry",
      detail: makeDetail({
         inputTokens: 174_000,
         usagePercentage: 64.0,
         activeTags: 845,
         droppedTags: 645,
         totalTags: 1_490,
         activeBytes: 642_000,
         compartmentCount: 24,
         factCount: 8,
         memoryCount: 25,
         memoryBlockCount: 17,
         issueLines: ["Pi compaction marker retry queued after append failure"],
         compartmentTokens: 9_500,
         factTokens: 820,
         memoryTokens: 3_100,
         historyBlockTokens: 10_320,
         toolCallTokens: 73_000,
      }),
      logs: demoLogs("step=compaction-marker-retry", [
         "fake appendCompaction returned no id",
         "fake marker kept retryable",
      ]),
   },
   {
      id: "emergency-overflow-recovery",
      title: "Overflow recovery",
      detail: makeDetail({
         inputTokens: 259_000,
         usagePercentage: 95.2,
         activeTags: 1_180,
         droppedTags: 700,
         totalTags: 1_880,
         activeBytes: 980_000,
         compartmentCount: 26,
         factCount: 9,
         memoryCount: 26,
         memoryBlockCount: 18,
         pendingOpsCount: 8,
         issueLines: ["Emergency recovery: overflow detected, drop-all-tools armed"],
         compartmentTokens: 12_000,
         factTokens: 900,
         memoryTokens: 3_400,
         historyBlockTokens: 12_900,
         toolCallTokens: 145_000,
      }),
      logs: demoLogs("step=emergency-overflow-recovery", [
         "fake provider context overflow detected",
         "fake emergency materialization pending",
      ]),
   },
   {
      id: "dreamer-task-failure",
      title: "Dreamer task failed",
      detail: makeDetail({
         inputTokens: 180_000,
         usagePercentage: 66.2,
         activeTags: 880,
         droppedTags: 700,
         totalTags: 1_580,
         activeBytes: 690_000,
         compartmentCount: 27,
         factCount: 9,
         memoryCount: 27,
         memoryBlockCount: 18,
         dreamerEnabled: true,
         dreamerSchedule: "02:00-06:00",
         issueLines: ["Dreamer failed: task timeout; remaining tasks skipped"],
         compartmentTokens: 12_200,
         factTokens: 920,
         memoryTokens: 3_600,
         historyBlockTokens: 13_120,
         toolCallTokens: 82_000,
      }),
      logs: demoLogs("step=dreamer-task-failure", [
         "fake dreamer task timeout",
         "fake result recorded with failed task",
      ]),
   },
   {
      id: "dreamer-lease-busy",
      title: "Dreamer lease busy",
      detail: makeDetail({
         inputTokens: 182_000,
         usagePercentage: 66.9,
         activeTags: 890,
         droppedTags: 700,
         totalTags: 1_590,
         activeBytes: 700_000,
         compartmentCount: 27,
         factCount: 9,
         memoryCount: 27,
         memoryBlockCount: 18,
         dreamerEnabled: true,
         dreamerSchedule: "02:00-06:00",
         issueLines: ["Dreamer skipped: lease already held by another run"],
         compartmentTokens: 12_300,
         factTokens: 920,
         memoryTokens: 3_600,
         historyBlockTokens: 13_220,
         toolCallTokens: 83_000,
      }),
      logs: demoLogs("step=dreamer-lease-busy", ["fake dream lease already held", "fake run skipped safely"]),
   },
   {
      id: "transform-warning",
      title: "Transform warning handled",
      detail: makeDetail({
         inputTokens: 188_000,
         usagePercentage: 69.1,
         activeTags: 910,
         droppedTags: 700,
         totalTags: 1_610,
         activeBytes: 720_000,
         compartmentCount: 27,
         factCount: 9,
         memoryCount: 26,
         memoryBlockCount: 18,
         sessionNoteCount: 3,
         pendingOpsCount: 4,
         lastTransformError: "Demo transform warning: skipped stale pending drop outside known tag range.",
         compartmentTokens: 12_400,
         factTokens: 920,
         memoryTokens: 3_500,
         historyBlockTokens: 13_320,
         toolCallTokens: 86_000,
      }),
      logs: demoLogs("step=transform-warning", ["fake pending_ops=4", "fake stale pending drop skipped"]),
   },
   {
      id: "cache-expired",
      title: "Cache expired",
      detail: makeDetail({
         inputTokens: 214_000,
         usagePercentage: 78.7,
         activeTags: 990,
         droppedTags: 760,
         totalTags: 1_750,
         activeBytes: 870_000,
         compartmentCount: 31,
         factCount: 11,
         memoryCount: 27,
         memoryBlockCount: 18,
         sessionNoteCount: 3,
         pendingOpsCount: 0,
         cacheRemainingMs: 0,
         cacheExpired: true,
         compartmentTokens: 16_000,
         factTokens: 1_100,
         memoryTokens: 3_800,
         historyBlockTokens: 17_100,
         toolCallTokens: 105_000,
      }),
      cache: { initialResponseAgeMs: 360_000 },
      logs: demoLogs("step=cache-expired", ["fake cache=expired", "fake next turn needs cache rebuild"]),
   },
];

export function getStatusDemoEnv(env: Record<string, string | undefined> = process.env): StatusDemoEnv {
   const raw = env.PI_MAGIC_CONTEXT_DEMO?.trim().toLowerCase();
   return { enabled: raw === "1" || raw === "true" || raw === "yes" || raw === "on" };
}

export function createStatusDemoController(options: CreateStatusDemoControllerOptions = {}): StatusDemoController {
   const now = options.now ?? Date.now;
   let index = clampStepIndex((options.initialStep ?? 1) - 1);
   let enteredAt = now();

   const enter = (nextIndex: number): StatusDemoSnapshot => {
      index = clampStepIndex(nextIndex);
      enteredAt = now();
      return snapshot();
   };

   const snapshot = (): StatusDemoSnapshot => {
      const step = STATUS_DEMO_STEPS[index];
      return {
         index,
         stepNumber: index + 1,
         totalSteps: STATUS_DEMO_STEPS.length,
         step,
         detail: buildLiveDetail(step, enteredAt, now()),
         banner: `DEMO MODE · Step ${index + 1}/${STATUS_DEMO_STEPS.length} · ${step.title}`,
         logs: step.logs,
      };
   };

   return {
      current: snapshot,
      next() {
         return enter(index + 1);
      },
      previous() {
         return enter(index - 1);
      },
      reset() {
         return enter(0);
      },
      goToStep(stepNumber: number) {
         return enter(Math.floor(stepNumber) - 1);
      },
   };
}

function buildLiveDetail(step: StatusDemoStep, enteredAt: number, now: number): StatusDialogDetail {
   const ttlMs = step.cache?.ttlMs ?? DEFAULT_CACHE_TTL_MS;
   const initialAgeMs = step.cache?.initialResponseAgeMs ?? DEFAULT_RESPONSE_AGE_MS;
   const ageMs = Math.max(0, initialAgeMs + Math.max(0, now - enteredAt));
   const cacheRemainingMs = Math.max(0, ttlMs - ageMs);
   return {
      ...step.detail,
      lastResponseTime: enteredAt - initialAgeMs,
      cacheRemainingMs,
      cacheExpired: cacheRemainingMs === 0,
   };
}

function clampStepIndex(index: number): number {
   if (!Number.isFinite(index)) return 0;
   return Math.min(Math.max(Math.floor(index), 0), STATUS_DEMO_STEPS.length - 1);
}
