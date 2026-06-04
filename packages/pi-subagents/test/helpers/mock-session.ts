import type { AgentSession } from "@earendil-works/pi-coding-agent";
import type { Mock } from "vitest";
import { vi } from "vitest";

/** The core shape returned by `createMockSession`. */
export interface MockSession {
   subscribe: Mock<(fn: (event: unknown) => void) => () => void>;
   emit(event: unknown): void;
   dispose: Mock<() => void>;
   steer: Mock<(...args: unknown[]) => Promise<unknown>>;
   sessionManager: { getSessionFile: Mock<() => unknown> };
}

/**
 * Shared test fixture: subscribable event bus with spy stubs.
 *
 * All fields are always present — callers that only need `subscribe`/`emit`
 * can ignore the rest. Pass `overrides` to replace or extend specific fields.
 */
/**
 * Cast a MockSession to AgentSession for use in ExecutionState.
 *
 * AgentSession is a class with private fields — no plain object satisfies it
 * without a type bridge. Centralising the cast here keeps test files free of
 * SDK imports and makes the intent explicit.
 */
export function toAgentSession(session: MockSession): AgentSession {
   return session as unknown as AgentSession;
}

export function createMockSession(overrides: Record<string, unknown> = {}): MockSession & Record<string, unknown> {
   const subscribers = new Set<(event: unknown) => void>();

   const subscribe = vi.fn((fn: (event: unknown) => void) => {
      subscribers.add(fn);
      return () => {
         subscribers.delete(fn);
      };
   });

   const base: MockSession = {
      subscribe,
      emit(event: unknown) {
         for (const fn of subscribers) fn(event);
      },
      dispose: vi.fn(),
      steer: vi.fn().mockResolvedValue(undefined),
      sessionManager: { getSessionFile: vi.fn() }
   };

   return { ...base, ...overrides };
}
