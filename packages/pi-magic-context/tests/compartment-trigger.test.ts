import { describe, expect, it } from "vitest";
import { getProactiveCompartmentTriggerPercentage } from "../core/hooks/magic-context/compartment-trigger";

describe("getProactiveCompartmentTriggerPercentage", () => {
   it("returns executeThreshold - 2", () => {
      expect(getProactiveCompartmentTriggerPercentage(65)).toBe(63);
   });

   it("clamps to 0 when executeThreshold is below the offset", () => {
      expect(getProactiveCompartmentTriggerPercentage(1)).toBe(0);
      expect(getProactiveCompartmentTriggerPercentage(0)).toBe(0);
   });

   it("is independent of context size (no large-context cap)", () => {
      // The proactive floor is a pure percentage of the execute threshold,
      // so a 1M-context model fires at the same percentage as a 128K one.
      expect(getProactiveCompartmentTriggerPercentage(65)).toBe(63);
      // 63% of 1M = 630K tokens, 63% of 128K = 80.64K tokens — both fire at 63%.
      const threshold1M = (getProactiveCompartmentTriggerPercentage(65) / 100) * 1_000_000;
      const threshold128K = (getProactiveCompartmentTriggerPercentage(65) / 100) * 128_000;
      expect(threshold1M).toBe(630_000);
      expect(threshold128K).toBe(80_640);
   });
});
