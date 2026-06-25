/**
 * Status reporter for pi-reference.
 *
 * Decouples git-cache.ts / permissions.ts / resolve.ts from the Pi UI context.
 * index.ts wires the UI context on session_start; other modules call
 * reportInfo / reportWarning / reportError.
 *
 * Two display surfaces:
 *   - setStatus(): compact persistent footer status ("refs: 17")
 *   - setWidget(): transient widget above editor, ONLY during clone operations,
 *     showing the full owner/repo being cloned. Cleared when all clones finish.
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

/** Track git operations in progress for the widget. */
const inProgress = new Set<string>();

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

// ─── Git progress tracking ───────────────────────────────────────

export function reportCloneStart(cacheKey: string): void {
   inProgress.add(cacheKey);
   refreshCloneWidget();
}

export function reportCloneDone(cacheKey: string): void {
   inProgress.delete(cacheKey);
   refreshCloneWidget();
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

// ─── Clone widget (transient, only during operations) ────────────

const WIDGET_KEY = "pi-reference-clone";

function refreshCloneWidget(): void {
   if (!ui?.hasUI) return;

   if (inProgress.size === 0) {
      ui.setWidget(WIDGET_KEY, undefined, { placement: "aboveEditor" });
      return;
   }

   const lines: string[] = [];
   for (const cacheKey of inProgress) {
      // cacheKey is "host/org/repo" — strip host for display
      const parts = cacheKey.split("/");
      const ownerRepo = parts.length >= 2 ? parts.slice(1).join("/") : cacheKey;
      lines.push(`⠋ cloning ${ownerRepo}...`);
   }

   ui.setWidget(WIDGET_KEY, lines, { placement: "aboveEditor" });
}
