import type { PersistedCompactionMarkerState as CompactionMarkerState } from "./storage-meta-persisted";

const BASE62_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

function randomBase62(length: number): string {
   const chars: string[] = [];
   for (let i = 0; i < length; i++) {
      chars.push(BASE62_CHARS[Math.floor(Math.random() * BASE62_CHARS.length)]);
   }
   return chars.join("");
}

function generateId(prefix: string, timestampMs: number, counter = 0n): string {
   const encoded = BigInt(timestampMs) * 0x1000n + counter;
   const hex = encoded.toString(16).padStart(14, "0");
   return `${prefix}_${hex}${randomBase62(14)}`;
}

export function generateMessageId(timestampMs: number, counter = 0n): string {
   return generateId("msg", timestampMs, counter);
}

export function generatePartId(timestampMs: number, counter = 0n): string {
   return generateId("prt", timestampMs, counter);
}

export function closeCompactionMarkerDb(): void {}

export function findBoundaryUserMessage(
   _sessionId: string,
   _endOrdinal: number,
): { id: string; timeCreated: number } | null {
   return null;
}

export function getHostMessageById(_sessionId: string, _messageId: string): { id: string } | null {
   return null;
}

export interface InjectCompactionMarkerArgs {
   sessionId: string;
   endOrdinal: number;
   summaryText: string;
   directory: string;
}

export function injectCompactionMarker(
   _args: InjectCompactionMarkerArgs,
): Omit<CompactionMarkerState, "boundaryOrdinal"> | null {
   return null;
}

export function removeCompactionMarker(_state: CompactionMarkerState): boolean {
   return true;
}
