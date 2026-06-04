import { describe, expect, it } from "vitest";

// Mock theme that just returns text as-is
const mockTheme = {
   fg: (_color: string, text: string) => text
};

// Helper to create mock segment context
function createMockCtx(overrides: Record<string, any> = {}) {
   return {
      autoCompactEnabled: false,
      colors: {},
      contextPercent: 0,
      contextTokens: 0,
      contextWindow: 0,
      customCompactionEnabled: false,
      theme: mockTheme,
      usageStats: { cacheRead: 0, cacheWrite: 0, cost: 0, input: 0, output: 0 },
      ...overrides
   };
}

// Import segments from the module
import { SEGMENTS } from "../segments.ts";

describe("cache_read segment", () => {
   it("shows cost next to cache tokens when cost exists", () => {
      const ctx = createMockCtx({
         usageStats: { cacheRead: 405_000, cacheWrite: 0, cost: 0.105, input: 10_000, output: 5000 }
      });
      const result = SEGMENTS.cache_read.render(ctx as any);
      expect(result.visible).toBe(true);
      expect(result.content).toContain("C:405k | $0.105");
   });

   it("shows only cache tokens when cost is 0", () => {
      const ctx = createMockCtx({
         usageStats: { cacheRead: 405_000, cacheWrite: 0, cost: 0, input: 10_000, output: 5000 }
      });
      const result = SEGMENTS.cache_read.render(ctx as any);
      expect(result.visible).toBe(true);
      expect(result.content).toContain("C:405k");
      expect(result.content).not.toContain("$");
   });

   it("hides when no cache read tokens", () => {
      const ctx = createMockCtx({
         usageStats: { cacheRead: 0, cacheWrite: 0, cost: 0.105, input: 10_000, output: 5000 }
      });
      const result = SEGMENTS.cache_read.render(ctx as any);
      expect(result.visible).toBe(false);
   });
});

describe("cost segment (auto)", () => {
   it("shows only (auto) without cost", () => {
      const ctx = createMockCtx({
         autoCompactEnabled: true,
         usageStats: { cacheRead: 405_000, cacheWrite: 0, cost: 0.105, input: 10_000, output: 5000 }
      });
      const result = SEGMENTS.cost.render(ctx as any);
      expect(result.visible).toBe(true);
      expect(result.content).toContain("(auto)");
      expect(result.content).not.toContain("$");
   });

   it("hides when auto compact disabled", () => {
      const ctx = createMockCtx({
         autoCompactEnabled: false,
         usageStats: { cacheRead: 405_000, cacheWrite: 0, cost: 0.105, input: 10_000, output: 5000 }
      });
      const result = SEGMENTS.cost.render(ctx as any);
      expect(result.visible).toBe(false);
   });
});
