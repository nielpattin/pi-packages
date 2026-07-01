/**
 * Status reporter for pi-reference.
 *
 * Decouples git-cache.ts / permissions.ts / resolve.ts from the Pi UI context.
 * index.ts wires the UI context on session_start; other modules call
 * reportInfo / reportWarning / reportError.
 *
 * Two display surfaces:
 *   - setStatus(): compact persistent footer status ("refs: 17")
 *   - setWidget(): single progress line during reference sync, cleared when done.
 *     Shows a counter ("Syncing references... 3/16") so the user can see
 *     sync progress without per-repo flickering.
 */

import type { ReferenceInfo } from "./types.js";

// ─── UI context (set by index.ts) ────────────────────────────────

interface UiContext {
   hasUI: boolean;
   notify(message: string, type?: "info" | "warning" | "error"): void;
   setStatus(key: string, text: string | undefined): void;
   setWidget(key: string, content: string[] | undefined, options?: { placement?: "aboveEditor" | "belowEditor" }): void;
}

let ui: UiContext | null = null;
let currentReferences: ReferenceInfo[] = [];

export function setUiContext(ctx: UiContext | null): void {
   ui = ctx;
}

export function setCurrentReferences(refs: ReferenceInfo[]): void {
   currentReferences = refs;
   updateFooterStatus();
}

// ─── Status reporting (transient toasts) ─────────────────────────

export function reportInfo(msg: string): void {
   ui?.notify(msg, "info");
}

export function reportWarning(msg: string): void {
   ui?.notify(msg, "warning");
}

export function reportError(msg: string): void {
   ui?.notify(msg, "error");
}

// ─── Sync progress tracking ──────────────────────────────────────
//
// One-line widget that shows a counter during reference sync:
//
//   ⠋ Syncing references... 3/16
//
// No per-repo flickering. Updates the counter as each repo finishes.
// Cleared when all repos are done. A summary toast appears only if
// some repos failed to sync.

const WIDGET_KEY = "pi-reference-sync";

// Braille spinner frames — cycle through while sync is active.
const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const SPINNER_INTERVAL_MS = 80;

let syncTotal = 0;
let syncDone = 0;
let syncFailed: string[] = [];
let syncActive = false;
let spinnerTimer: ReturnType<typeof setInterval> | null = null;
let spinnerFrame = 0;

/** Start tracking a sync batch with the given total repo count. */
export function beginSync(total: number): void {
   syncTotal = total;
   syncDone = 0;
   syncFailed = [];
   syncActive = total > 0;
   spinnerFrame = 0;
   startSpinner();
   refreshSyncWidget();
}

/** Mark one repo as done, optionally recording it as failed. */
export function reportSyncStep(ownerRepo: string, failed: boolean): void {
   syncDone++;
   if (failed) syncFailed.push(ownerRepo);
}

/** Finish the sync batch: clear widget, show summary toast if failures. */
export function endSync(): void {
   if (!syncActive) return;
   syncActive = false;
   stopSpinner();
   refreshSyncWidget();
   if (syncFailed.length > 0) {
      const summary =
         syncFailed.length === syncTotal
            ? `All ${syncFailed.length} references failed to sync: ${syncFailed.join(", ")}`
            : `${syncFailed.length} of ${syncTotal} references failed to sync: ${syncFailed.join(", ")}`;
      reportWarning(summary);
   }
   syncTotal = 0;
   syncDone = 0;
   syncFailed = [];
}

function startSpinner(): void {
   if (spinnerTimer) return;
   spinnerTimer = setInterval(() => {
      spinnerFrame = (spinnerFrame + 1) % SPINNER_FRAMES.length;
      refreshSyncWidget();
   }, SPINNER_INTERVAL_MS);
}

function stopSpinner(): void {
   if (spinnerTimer) {
      clearInterval(spinnerTimer);
      spinnerTimer = null;
   }
}

function refreshSyncWidget(): void {
   if (!ui?.hasUI) return;

   if (!syncActive || syncTotal === 0) {
      ui.setWidget(WIDGET_KEY, undefined, { placement: "aboveEditor" });
      return;
   }

   const spinner = SPINNER_FRAMES[spinnerFrame];
   ui.setWidget(WIDGET_KEY, [`${spinner} Syncing references... ${syncDone}/${syncTotal}`], {
      placement: "aboveEditor",
   });
}

// ─── Footer status (persistent, compact) ─────────────────────────

const STATUS_KEY = "pi-reference";

function updateFooterStatus(): void {
   if (!ui?.hasUI) return;
   if (currentReferences.length === 0) {
      ui.setStatus(STATUS_KEY, undefined);
      return;
   }
   ui.setStatus(STATUS_KEY, `refs: ${currentReferences.length}`);
}
