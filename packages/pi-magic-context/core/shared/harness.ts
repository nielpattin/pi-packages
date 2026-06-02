/** Harness identifier for this Pi package. */
export type HarnessId = "host" | "pi";

let currentHarness: HarnessId = "pi";
let harnessLocked = false;

/**
 * Set the harness identifier for this plugin instance. Must be called once
 * at boot before any DB write happens. Subsequent calls with a different
 * value throw to prevent accidental mid-session swaps that would corrupt
 * the harness column and break per-harness session scoping.
 *
 * Calling with the same value as the current is a no-op (safe to call
 * defensively).
 */
export function setHarness(value: HarnessId): void {
   if (harnessLocked && currentHarness !== value) {
      throw new Error(`Magic Context: harness already locked to "${currentHarness}"; cannot change to "${value}"`);
   }
   currentHarness = value;
   harnessLocked = true;
}

/**
 * Get the current harness identifier. Used by storage modules when
 * INSERTing session-scoped rows so each row is correctly attributed.
 */
export function getHarness(): HarnessId {
   return currentHarness;
}

/**
 * Test-only helper to reset harness state between test cases. Do NOT call
 * from production code paths.
 */
export function _resetHarnessForTesting(): void {
   currentHarness = "pi";
   harnessLocked = false;
}
