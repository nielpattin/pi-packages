import { describe, expect, test } from "vitest";
import { createStatusDemoController, getStatusDemoEnv, STATUS_DEMO_STEPS } from "../src/demo/status-demo";

describe("status demo module", () => {
   test("is disabled unless PI_MAGIC_CONTEXT_DEMO is explicitly enabled", () => {
      expect(getStatusDemoEnv({}).enabled).toBe(false);
      expect(getStatusDemoEnv({ PI_MAGIC_CONTEXT_DEMO: "0" }).enabled).toBe(false);
      expect(getStatusDemoEnv({ PI_MAGIC_CONTEXT_DEMO: "1" }).enabled).toBe(true);
      expect(getStatusDemoEnv({ PI_MAGIC_CONTEXT_DEMO: "true" }).enabled).toBe(true);
   });

   test("starts at the first step and moves through a bounded demo sequence", () => {
      const controller = createStatusDemoController();

      expect(controller.current().index).toBe(0);
      expect(controller.current().stepNumber).toBe(1);
      expect(controller.current().totalSteps).toBe(STATUS_DEMO_STEPS.length);

      controller.next();
      expect(controller.current().stepNumber).toBe(2);

      controller.previous();
      expect(controller.current().stepNumber).toBe(1);

      controller.previous();
      expect(controller.current().stepNumber).toBe(1);

      controller.goToStep(STATUS_DEMO_STEPS.length + 10);
      expect(controller.current().stepNumber).toBe(STATUS_DEMO_STEPS.length);

      controller.reset();
      expect(controller.current().stepNumber).toBe(1);
   });

   test("returns fake status data and clearly marked demo log lines for each step", () => {
      const controller = createStatusDemoController({ initialStep: 4 });
      const current = controller.current();

      expect(current.detail.sessionId).toBe("demo-session");
      expect(current.detail.pendingOpsCount).toBeGreaterThan(0);
      expect(current.banner).toContain("DEMO MODE");
      expect(current.banner).toContain(`Step ${current.stepNumber}/${current.totalSteps}`);
      expect(current.logs.length).toBeGreaterThan(0);
      expect(current.logs.every((line) => line.startsWith("[magic-context-demo]"))).toBe(true);
      expect(current.logs.join("\n")).toContain("no database opened");
   });

   test("makes the Dreamer scheduled step explicit in status detail", () => {
      const dreamer = createStatusDemoController({ initialStep: 8 }).current();

      expect(dreamer.banner).toContain("Dreamer scheduled");
      expect(dreamer.detail.dreamerEnabled).toBe(true);
      expect(dreamer.detail.dreamerSchedule).toBe("02:00-06:00");
      expect(dreamer.detail.readySmartNoteCount).toBe(1);
   });

   test("covers handled edge-case states as separate demo steps", () => {
      const ids = STATUS_DEMO_STEPS.map((step) => step.id);
      expect(ids).toEqual([
         "clean-startup",
         "context-growing",
         "large-context-1m",
         "pending-drops",
         "flush-applied",
         "historian-running",
         "compartments-written",
         "dreamer-scheduled",
         "config-recovered",
         "startup-storage-warning",
         "embedding-fallback",
         "auto-search-timeout",
         "historian-existing-invalid",
         "historian-chunk-unsafe",
         "historian-spawn-timeout",
         "historian-editor-fallback",
         "compaction-marker-retry",
         "emergency-overflow-recovery",
         "dreamer-task-failure",
         "dreamer-lease-busy",
         "transform-warning",
         "cache-expired",
      ]);

      const byId = new Map(
         STATUS_DEMO_STEPS.map((step, index) => [
            step.id,
            createStatusDemoController({ initialStep: index + 1 }).current(),
         ]),
      );
      expect(byId.get("historian-existing-invalid")?.detail.historianLastError).toContain(
         "existing stored compartments",
      );
      expect(byId.get("historian-chunk-unsafe")?.detail.historianLastError).toContain("raw chunk");
      expect(byId.get("historian-spawn-timeout")?.detail.historianLastError).toContain("timed out");
      expect(byId.get("transform-warning")?.detail.lastTransformError).toContain("transform warning");
      expect(byId.get("cache-expired")?.detail.cacheExpired).toBe(true);
      expect(byId.get("auto-search-timeout")?.detail.issueLines.join("\n")).toContain("Auto-search skipped");
      expect(byId.get("dreamer-task-failure")?.detail.issueLines.join("\n")).toContain("Dreamer failed");
   });

   test("updates demo cache timing from a live clock and resets it on navigation", () => {
      let now = 1_000_000;
      const controller = createStatusDemoController({
         initialStep: 2,
         now: () => now,
      });

      const first = controller.current().detail;
      expect(first.cacheExpired).toBe(false);
      expect(first.cacheRemainingMs).toBe(290_000);
      expect(first.lastResponseTime).toBe(990_000);

      now += 2_000;
      const afterTwoSeconds = controller.current().detail;
      expect(afterTwoSeconds.cacheRemainingMs).toBe(288_000);
      expect(afterTwoSeconds.lastResponseTime).toBe(990_000);

      const nextStep = controller.next().detail;
      expect(nextStep.cacheRemainingMs).toBe(290_000);
      expect(nextStep.lastResponseTime).toBe(992_000);

      controller.goToStep(STATUS_DEMO_STEPS.length);
      const expired = controller.current().detail;
      expect(expired.cacheRemainingMs).toBe(0);
      expect(expired.cacheExpired).toBe(true);
   });
});
