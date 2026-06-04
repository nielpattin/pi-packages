import { Database } from "../../shared/sqlite";

interface RawCountRow {
   count?: number;
}

export function withReadOnlySessionDb<T>(_fn: (db: Database) => T): T | null {
   return null;
}

export function closeReadOnlySessionDb(): void {}

export function getRawSessionMessageCountFromDb(db: Database, sessionId: string): number {
   const row = db
      .prepare(
         `SELECT COUNT(*) as count FROM message WHERE session_id = ?
             AND NOT (COALESCE(json_extract(data, '$.summary'), 0) = 1
                      AND COALESCE(json_extract(data, '$.finish'), '') = 'stop')`
      )
      .get(sessionId) as RawCountRow | null;
   return typeof row?.count === "number" ? row.count : 0;
}

export function isMidTurn(_deps: unknown, _sessionId: string): boolean {
   return false;
}

export function getMessageTimesFromFallbackDb(_sessionId: string, _messageIds: readonly string[]): Map<string, number> {
   return new Map<string, number>();
}

export function findLastAssistantModelFromFallbackDb(
   _sessionId: string
): { providerID: string; modelID: string; agent?: string } | null {
   return null;
}
