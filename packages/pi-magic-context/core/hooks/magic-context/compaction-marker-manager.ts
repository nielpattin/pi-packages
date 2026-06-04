import type { Database } from "../../shared/sqlite";
import type { PendingCompactionMarker } from "../../features/magic-context/storage-meta";

export type MarkerUpdateOutcome =
   | { kind: "applied"; markerOrdinal: number }
   | { kind: "already-current" }
   | {
        kind: "stale-skip";
        reason: "compartment-removed" | "target-superseded";
     }
   | { kind: "retryable-failure"; error: Error };

export function applyDeferredCompactionMarker(
   _db: Database,
   _sessionId: string,
   _pending: PendingCompactionMarker,
   _directory?: string
): MarkerUpdateOutcome {
   return { kind: "already-current" };
}

export function updateCompactionMarkerAfterPublication(
   _db: Database,
   _sessionId: string,
   _lastCompartmentEnd: number,
   _directory?: string
): void {}

export function removeCompactionMarkerForSession(_db: Database, _sessionId: string): void {}

export function closeCompactionMarkerConnection(): void {}

export function checkCompactionMarkerConsistency(_db: Database): void {}
