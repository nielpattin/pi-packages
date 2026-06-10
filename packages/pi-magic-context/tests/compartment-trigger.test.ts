import { describe, expect, it } from "vitest";
import { getProactiveCompartmentTriggerPercentage } from "../core/hooks/magic-context/compartment-trigger";

describe("getProactiveCompartmentTriggerPercentage", () => {
   it("returns executeThreshold - 2 for small context models", () => {
      // 128K context, below the 272K cap
      expect(getProactiveCompartmentTriggerPercentage(65, 128_000)).toBe(63);
   });

   it("returns (272K / contextLimit) * (threshold - 2) for large context models", () => {
      // 1M context model: (272K / 1M) * 63 = 17.136% → ~171,360 tokens
      const result = getProactiveCompartmentTriggerPercentage(65, 1_000_000);
      expect(result).toBeCloseTo(17.136, 2);
   });

   it("returns executeThreshold - 2 when contextLimit is undefined", () => {
      expect(getProactiveCompartmentTriggerPercentage(65)).toBe(63);
   });

   it("caps effective context at 272K for a 512K model", () => {
      // (272K / 512K) * 63 = 33.46875% → ~171,360 tokens
      const result = getProactiveCompartmentTriggerPercentage(65, 512_000);
      expect(result).toBeCloseTo(33.46875, 3);
   });

   it("returns executeThreshold - 2 for a model exactly at 272K", () => {
      // 272K is NOT > 272K, so falls through to default
      expect(getProactiveCompartmentTriggerPercentage(65, 272_000)).toBe(63);
   });

   it("returns capped percentage for a 272K+1 model", () => {
      // (272K / 272001) * 63 ≈ 62.9998%
      const result = getProactiveCompartmentTriggerPercentage(65, 272_001);
      expect(result).toBeCloseTo((272_000 / 272_001) * 63, 3);
   });

   it("all large models trigger at ~171K tokens regardless of context size", () => {
      // The absolute token threshold should be the same for all large models
      const threshold1M = (getProactiveCompartmentTriggerPercentage(65, 1_000_000) / 100) * 1_000_000;
      const threshold512K = (getProactiveCompartmentTriggerPercentage(65, 512_000) / 100) * 512_000;
      const threshold400K = (getProactiveCompartmentTriggerPercentage(65, 400_000) / 100) * 400_000;
      expect(threshold1M).toBeCloseTo(171_360, 0);
      expect(threshold512K).toBeCloseTo(171_360, 0);
      expect(threshold400K).toBeCloseTo(171_360, 0);
   });
});
