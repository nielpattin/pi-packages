import type { Database } from "../../shared/sqlite";

type BackfillStatus = "pending" | "completed" | "failed" | "skipped";

interface BackfillStateRow {
   session_id: string;
   status: BackfillStatus;
   attempts: number;
   completed_at: number | null;
   error: string | null;
}

interface BackfillResult {
   processed: number;
   completed: number;
   failed: number;
   skipped: number;
}

export function runToolOwnerBackfill(_db: Database): BackfillResult {
   return { processed: 0, completed: 0, failed: 0, skipped: 0 };
}

export function isToolOwnerBackfillNeeded(_db: Database): boolean {
   return false;
}

export function _getBackfillState(_db: Database, _sessionId: string): BackfillStateRow | null {
   return null;
}
